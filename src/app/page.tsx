import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/ProductCard";
import { ArrowRight, Sparkles, Zap, Headphones, Keyboard, Smartphone, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Fetch banners, categories, and featured products directly from Prisma
  const banners = await prisma.banner.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  const categories = await prisma.category.findMany({
    where: { isActive: true },
    include: {
      _count: { select: { products: true } },
    },
    take: 6,
  });

  const featuredProducts = await prisma.product.findMany({
    where: { status: "ACTIVE", deletedAt: null },
    include: {
      brand: true,
      category: true,
      variants: true,
      images: { orderBy: { sortOrder: "asc" } },
    },
    take: 8,
  });

  const heroBanner = banners[0] || {
    title: "Next-Gen Audio Experience",
    subtitle: "Experience flagship active noise cancellation with the new Sony & Apple collections.",
    badge: "FLAGSHIP COLLECTION 2026",
    linkUrl: "/products",
    imageUrl: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=1600&q=80",
  };

  return (
    <div className="space-y-16 pb-20">
      {/* 1. Hero Section */}
      <section className="relative px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pt-6">
        <div className="relative rounded-[2.5rem] overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl min-h-[460px] md:min-h-[520px] flex items-center">
          <img
            src={heroBanner.imageUrl}
            alt={heroBanner.title}
            className="absolute inset-0 w-full h-full object-cover object-center opacity-45 mix-blend-luminosity scale-105 hover:scale-100 transition-transform duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />

          <div className="relative z-10 max-w-2xl p-8 sm:p-12 lg:p-16 space-y-6">
            {heroBanner.badge && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                {heroBanner.badge}
              </span>
            )}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1]">
              {heroBanner.title}
            </h1>
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-lg">
              {heroBanner.subtitle}
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href={heroBanner.linkUrl || "/products"}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95"
              >
                Explore Collection
                <ArrowRight className="w-4 h-4" />
              </Link>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-300 bg-white/10 backdrop-blur-md px-4 py-3 rounded-full border border-white/10">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Use code <strong className="text-white">RIPZY10</strong> for 10% off</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Category Highlights (FR-HOME-02) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Browse Departments</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              Curated Categories
            </h2>
          </div>
          <Link
            href="/products"
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group"
          >
            View All
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/products?category=audio"
            className="group relative p-6 rounded-3xl bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-slate-900 dark:to-slate-800/80 border border-indigo-100/60 dark:border-slate-800 hover:border-indigo-400 transition-all hover:-translate-y-1 shadow-sm"
          >
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-md shadow-indigo-600/20">
              <Headphones className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
              Audio & ANC
            </h3>
            <p className="text-xs text-slate-500 mt-1">Headphones, In-Ear & DACs</p>
          </Link>

          <Link
            href="/products?category=workspace"
            className="group relative p-6 rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-900 dark:to-slate-800/80 border border-emerald-100/60 dark:border-slate-800 hover:border-emerald-400 transition-all hover:-translate-y-1 shadow-sm"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-md shadow-emerald-600/20">
              <Keyboard className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
              Keyboards & Desks
            </h3>
            <p className="text-xs text-slate-500 mt-1">Custom CNC Mechanicals</p>
          </Link>

          <Link
            href="/products?category=electronics"
            className="group relative p-6 rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-900 dark:to-slate-800/80 border border-amber-100/60 dark:border-slate-800 hover:border-amber-400 transition-all hover:-translate-y-1 shadow-sm"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-md shadow-amber-600/20">
              <Smartphone className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-amber-600 transition-colors">
              Smart Flagships
            </h3>
            <p className="text-xs text-slate-500 mt-1">OLED Smartphones & Wearables</p>
          </Link>

          <Link
            href="/products"
            className="group relative p-6 rounded-3xl bg-gradient-to-br from-rose-50 to-pink-50 dark:from-slate-900 dark:to-slate-800/80 border border-rose-100/60 dark:border-slate-800 hover:border-rose-400 transition-all hover:-translate-y-1 shadow-sm"
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-md shadow-rose-600/20">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-rose-600 transition-colors">
              Trending Drops
            </h3>
            <p className="text-xs text-slate-500 mt-1">Limited edition gear</p>
          </Link>
        </div>
      </section>

      {/* 3. Featured Products Grid (FR-HOME-02 & FR-CAT-07) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Handpicked For You</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
              Featured Flagships
            </h2>
          </div>
          <Link
            href="/products"
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group"
          >
            Explore Catalog
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map((p) => {
            const defaultVariant = p.variants[0];
            const primaryImg = p.images.find((img) => img.isPrimary)?.url || p.images[0]?.url;
            return (
              <ProductCard
                key={p.id}
                id={p.id}
                name={p.name}
                slug={p.slug}
                brandName={p.brand?.name}
                categoryName={p.category?.name}
                price={defaultVariant?.price || 0}
                compareAtPrice={defaultVariant?.compareAtPrice}
                imageUrl={primaryImg}
                variantsCount={p.variants.length}
                defaultVariantId={defaultVariant?.id || ""}
                stock={defaultVariant?.stock || 0}
              />
            );
          })}
        </div>
      </section>

      {/* 4. Promotional Banner (Code: RIPZY10) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-indigo-700 via-purple-700 to-rose-600 p-8 sm:p-12 text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl text-center md:text-left">
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-white/20 uppercase tracking-wider">
              Exclusive Welcome Offer
            </span>
            <h3 className="text-2xl sm:text-3xl font-black">
              Get 10% Off Your First Order Today
            </h3>
            <p className="text-sm text-indigo-100">
              Apply coupon <code className="bg-black/30 px-2 py-0.5 rounded font-mono font-bold text-amber-300">RIPZY10</code> at checkout. Minimum order value ₹1,499.
            </p>
          </div>
          <Link
            href="/products"
            className="px-6 py-3 rounded-full bg-white text-indigo-900 font-bold text-sm hover:bg-slate-100 transition-transform hover:scale-105 active:scale-95 shadow-lg whitespace-nowrap"
          >
            Claim Discount Now
          </Link>
        </div>
      </section>
    </div>
  );
}
