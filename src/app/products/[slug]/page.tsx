import React from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import ProductDetailClient from "@/components/ProductDetailClient";
import ProductCard from "@/components/ProductCard";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await prisma.product.findFirst({
    where: { slug, status: "ACTIVE", deletedAt: null },
    include: { images: true, brand: true },
  });

  if (!product) return { title: "Product Not Found | Ripzy", robots: { index: false } };

  const primaryImg = product.images.find((i) => i.isPrimary)?.url || product.images[0]?.url;
  const description = product.metaDescription || product.shortDescription || product.description.substring(0, 160);
  const title = product.metaTitle || `${product.name} | Ripzy`;

  return {
    title,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      title: product.name,
      description,
      type: "website",
      images: primaryImg ? [{ url: primaryImg }] : [],
    },
    twitter: { card: "summary_large_image", title: product.name, description },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const product = await prisma.product.findFirst({
    where: { slug, status: "ACTIVE", deletedAt: null },
    include: {
      brand: true,
      category: true,
      variants: { orderBy: { price: "asc" } },
      images: { orderBy: { sortOrder: "asc" } },
      reviews: {
        where: { status: "APPROVED" },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!product) notFound();

  const reviewCount = product.reviews.length;
  const avgRating = reviewCount ? product.reviews.reduce((a, r) => a + r.rating, 0) / reviewCount : 0;
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: product.reviews.filter((r) => r.rating === star).length,
  }));

  // Related: same category first, topped up with same brand, then anything active.
  const relatedInclude = {
    brand: true,
    variants: { orderBy: { price: "asc" as const } },
    images: { orderBy: { sortOrder: "asc" as const } },
  };
  const baseWhere = { status: "ACTIVE", deletedAt: null, id: { not: product.id } };
  let related = product.categoryId
    ? await prisma.product.findMany({ where: { ...baseWhere, categoryId: product.categoryId }, include: relatedInclude, take: 4 })
    : [];
  if (related.length < 4) {
    const extra = await prisma.product.findMany({
      where: { ...baseWhere, id: { notIn: [product.id, ...related.map((r) => r.id)] } },
      include: relatedInclude,
      orderBy: { createdAt: "desc" },
      take: 4 - related.length,
    });
    related = [...related, ...extra];
  }

  const siteUrl = env.siteUrl.replace(/\/$/, "");
  const url = `${siteUrl}/products/${product.slug}`;
  const images = product.images.map((i) => i.url);
  const inStock = (v: { stock: number; reservedStock: number }) => v.stock - v.reservedStock > 0;

  const jsonLd = {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: product.name,
    url,
    image: images.length ? images : undefined,
    description: product.description,
    sku: product.variants[0]?.sku,
    brand: { "@type": "Brand", name: product.brand?.name || "Ripzy" },
    category: product.category?.name,
    offers: product.variants.map((v) => ({
      "@type": "Offer",
      url,
      sku: v.sku,
      name: v.title,
      priceCurrency: "INR",
      price: v.price,
      itemCondition: "https://schema.org/NewCondition",
      availability: inStock(v) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    })),
    ...(reviewCount > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: Number(avgRating.toFixed(2)),
        reviewCount,
      },
      review: product.reviews.slice(0, 5).map((r) => ({
        "@type": "Review",
        reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
        author: { "@type": "Person", name: r.user.name },
        reviewBody: r.comment,
        datePublished: r.createdAt.toISOString().slice(0, 10),
      })),
    }),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Products", item: `${siteUrl}/products` },
      ...(product.category
        ? [{ "@type": "ListItem", position: 3, name: product.category.name, item: `${siteUrl}/products?category=${product.category.slug}` }]
        : []),
      { "@type": "ListItem", position: product.category ? 4 : 3, name: product.name, item: url },
    ],
  };

  // Escape "<" so product text can never close the script tag.
  const ld = (o: unknown) => JSON.stringify(o).replace(/</g, "\\u003c");

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(breadcrumbLd) }} />
      <ProductDetailClient
        product={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description,
          shortDescription: product.shortDescription,
          taxRate: product.taxRate,
          brand: product.brand ? { name: product.brand.name } : null,
          category: product.category ? { name: product.category.name, slug: product.category.slug } : null,
          variants: product.variants.map((v) => ({
            id: v.id,
            sku: v.sku,
            title: v.title,
            price: v.price,
            compareAtPrice: v.compareAtPrice,
            stock: Math.max(0, v.stock - v.reservedStock), // available to buy
            lowStockThreshold: v.lowStockThreshold,
            attributes: v.attributes,
          })),
          images: product.images.map((i) => ({ id: i.id, url: i.url, altText: i.altText, isPrimary: i.isPrimary })),
          reviews: product.reviews.slice(0, 10).map((r) => ({
            id: r.id,
            rating: r.rating,
            title: r.title,
            comment: r.comment,
            isVerifiedBuyer: r.isVerifiedBuyer,
            author: r.user.name,
            createdAt: r.createdAt.toISOString(),
          })),
          ratingSummary: { average: avgRating, count: reviewCount, distribution },
        }}
      />

      {related.length > 0 && (
        <section aria-labelledby="related-heading" className="container-page pb-16">
          <h2 id="related-heading" className="mb-5 text-xl font-semibold text-slate-900 sm:text-2xl">
            You might also like
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {related.map((p) => {
              const v = p.variants.find((x) => x.stock - x.reservedStock > 0) ?? p.variants[0];
              return (
                <ProductCard
                  key={p.id}
                  id={p.id}
                  name={p.name}
                  slug={p.slug}
                  brandName={p.brand?.name}
                  price={v?.price || 0}
                  compareAtPrice={v?.compareAtPrice}
                  imageUrl={p.images.find((i) => i.isPrimary)?.url || p.images[0]?.url}
                  defaultVariantId={v?.id || ""}
                  stock={v ? Math.max(0, v.stock - v.reservedStock) : 0}
                />
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
