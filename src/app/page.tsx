import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import HeroCarousel, { type HeroSlide } from "@/components/HeroCarousel";
import { getActiveBanners } from "@/lib/marketing";
import SectionHeader from "@/components/store/SectionHeader";
import TrustStrip from "@/components/store/TrustStrip";
import ProductRail from "@/components/store/ProductRail";
import NewsletterCta from "@/components/store/NewsletterCta";
import { toCardProps } from "@/components/store/cardProps";
import { Headphones, Keyboard, Smartphone, Laptop, Watch, Package, Percent, Headset, Wallet, BadgeCheck, Truck } from "lucide-react";

export const dynamic = "force-dynamic";

const CATEGORY_ICONS = [Headphones, Keyboard, Smartphone, Laptop, Watch, Package];

export default async function HomePage() {
  // Active, scheduled banners (cached, tag "banners")
  const banners = await getActiveBanners();

  const [categories, brands, pool] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      include: { _count: { select: { products: true } } },
      orderBy: { sortOrder: "asc" },
      take: 6,
    }),
    prisma.brand.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, take: 8 }),
    prisma.product.findMany({
      where: { status: "ACTIVE", deletedAt: null },
      include: {
        brand: true,
        category: true,
        variants: { orderBy: { price: "asc" } },
        images: { orderBy: { sortOrder: "asc" } },
      },
      orderBy: { createdAt: "desc" },
      take: 48,
    }),
  ]);

  const ratingRows = pool.length
    ? await prisma.review.groupBy({
        by: ["productId"],
        where: { productId: { in: pool.map((p) => p.id) }, status: "APPROVED" },
        _avg: { rating: true },
        _count: { rating: true },
      })
    : [];
  const ratings = new Map(ratingRows.map((r) => [r.productId, { avg: r._avg.rating ?? 0, count: r._count.rating }]));
  const card = (p: (typeof pool)[number]) => toCardProps(p, ratings.get(p.id));

  const featuredPool = pool.filter((p) => p.isFeatured);
  const featured = (featuredPool.length >= 4 ? featuredPool : pool).slice(0, 4).map(card);
  const newArrivals = pool.slice(0, 4).map(card);
  const topRated = [...pool]
    .filter((p) => (ratings.get(p.id)?.count ?? 0) > 0)
    .sort((a, b) => (ratings.get(b.id)!.avg - ratings.get(a.id)!.avg) || (ratings.get(b.id)!.count - ratings.get(a.id)!.count))
    .slice(0, 4)
    .map(card);
  const deals = pool
    .map((p) => {
      const v = p.variants.find((x) => x.stock - x.reservedStock > 0) ?? p.variants[0];
      const off = v?.compareAtPrice && v.compareAtPrice > v.price ? (v.compareAtPrice - v.price) / v.compareAtPrice : 0;
      return { p, off };
    })
    .filter((x) => x.off > 0)
    .sort((a, b) => b.off - a.off)
    .slice(0, 4)
    .map((x) => card(x.p));

  const fallbackSlide: HeroSlide = {
    id: "default",
    title: "Next-gen audio, delivered fast",
    subtitle: "Flagship noise cancellation from the brands you trust, with genuine warranty.",
    badge: "New collection 2026",
    linkUrl: "/products",
    imageUrl: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=1600&q=80",
  };
  const slides: HeroSlide[] = banners.length > 0 ? banners : [fallbackSlide];

  const benefits = [
    { icon: Truck, title: "Fast delivery", text: "Dispatched quickly and delivered in 2-3 business days." },
    { icon: BadgeCheck, title: "100% genuine", text: "Every product is sourced from authorised brands." },
    { icon: Wallet, title: "Flexible payments", text: "Pay with UPI, cards, netbanking or cash on delivery." },
    { icon: Headset, title: "Real support", text: "Friendly help before and after you buy." },
  ];

  return (
    <div className="space-y-12 pb-16 sm:space-y-14">
      <HeroCarousel slides={slides} promoCode={banners.length === 0 ? "RIPZY10" : undefined} />

      <div className="container-page">
        <TrustStrip />
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <section aria-labelledby="cat-heading" className="container-page">
          <SectionHeader id="cat-heading" title="Shop by category" href="/products" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
            {categories.map((c, i) => {
              const Icon = CATEGORY_ICONS[i % CATEGORY_ICONS.length];
              return (
                <Link
                  key={c.id}
                  href={`/products?category=${c.slug}`}
                  className="group card flex flex-col items-center gap-3 p-4 text-center transition hover:-translate-y-0.5 hover:shadow-card"
                >
                  <span className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-indigo-50 text-indigo-600">
                    {c.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    ) : (
                      <Icon className="h-8 w-8" />
                    )}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-slate-900 group-hover:text-indigo-600">{c.name}</span>
                    <span className="block text-xs text-slate-500">
                      {c._count.products} {c._count.products === 1 ? "product" : "products"}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <ProductRail id="featured-heading" title="Featured" eyebrow="Handpicked for you" href="/products" products={featured} />
      <ProductRail id="new-heading" title="New arrivals" href="/products?sort=newest" products={newArrivals} />

      {/* Offer banner */}
      <section aria-label="Welcome offer" className="container-page">
        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-subtle sm:flex-row sm:items-center sm:p-8">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <Percent className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Get 10% off your first order</h3>
              <p className="mt-0.5 text-sm text-slate-600">
                Apply coupon <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-slate-800">RIPZY10</code> at checkout. Minimum order value ₹1,499.
              </p>
            </div>
          </div>
          <Link href="/products" className="btn-primary shrink-0">
            Start shopping
          </Link>
        </div>
      </section>

      <ProductRail id="top-heading" title="Top rated" eyebrow="Loved by customers" href="/products" products={topRated} />
      <ProductRail id="deals-heading" title="Deals" eyebrow="Biggest savings" href="/products" products={deals} />

      {/* Brands */}
      {brands.length > 0 && (
        <section aria-labelledby="brands-heading" className="container-page">
          <SectionHeader id="brands-heading" title="Shop by brand" href="/products" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {brands.map((b) => (
              <Link
                key={b.id}
                href={`/products?brand=${b.slug}`}
                className="card flex h-16 items-center justify-center px-3 text-sm font-semibold text-slate-600 transition hover:text-indigo-600 hover:shadow-card"
              >
                {b.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.logo} alt={b.name} loading="lazy" className="max-h-8 w-auto object-contain" />
                ) : (
                  b.name
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Benefits */}
      <section aria-labelledby="why-heading" className="container-page">
        <SectionHeader id="why-heading" title="Why shop with Ripzy" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map(({ icon: Icon, title, text }) => (
            <div key={title} className="card p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-3 text-sm font-semibold text-slate-900">{title}</h3>
              <p className="mt-1 text-sm text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <NewsletterCta />
    </div>
  );
}
