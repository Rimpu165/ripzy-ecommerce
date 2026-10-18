import React from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ProductDetailClient from "@/components/ProductDetailClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug },
    include: { images: true, brand: true },
  });

  if (!product) {
    return { title: "Product Not Found — Ripzy" };
  }

  const primaryImg = product.images.find((i) => i.isPrimary)?.url || product.images[0]?.url;

  return {
    title: `${product.name} | Ripzy`,
    description: product.shortDescription || product.description.substring(0, 160),
    openGraph: {
      title: product.name,
      description: product.shortDescription || product.description.substring(0, 160),
      images: primaryImg ? [{ url: primaryImg }] : [],
    },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug, status: "ACTIVE", deletedAt: null },
    include: {
      brand: true,
      category: true,
      variants: {
        orderBy: { price: "asc" },
      },
      images: {
        orderBy: { sortOrder: "asc" },
      },
      reviews: {
        where: { status: "APPROVED" },
        include: { user: { select: { name: true } } },
      },
    },
  });

  if (!product) {
    notFound();
  }

  // JSON-LD Product Schema for SEO (FR-PDP-07)
  const defaultVariant = product.variants[0];
  const primaryImg = product.images.find((i) => i.isPrimary)?.url || product.images[0]?.url;

  const jsonLd = {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: product.name,
    image: primaryImg,
    description: product.description,
    brand: {
      "@type": "Brand",
      name: product.brand?.name || "Ripzy",
    },
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: defaultVariant?.price || 0,
      availability:
        defaultVariant && defaultVariant.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetailClient product={product as any} />
    </>
  );
}
