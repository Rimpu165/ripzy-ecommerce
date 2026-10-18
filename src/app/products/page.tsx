import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/ProductCard";
import { Filter, SlidersHorizontal, Search, RotateCcw } from "lucide-react";

export const dynamic = "force-dynamic";

interface SearchProps {
  searchParams: Promise<{
    category?: string;
    brand?: string;
    sort?: string;
    search?: string;
    minPrice?: string;
    maxPrice?: string;
    inStockOnly?: string;
    page?: string;
  }>;
}

export default async function ProductsPage({ searchParams }: SearchProps) {
  const params = await searchParams;
  const categorySlug = params.category;
  const brandSlug = params.brand;
  const sort = params.sort || "newest";
  const search = params.search?.trim();
  const minPrice = params.minPrice ? parseFloat(params.minPrice) : undefined;
  const maxPrice = params.maxPrice ? parseFloat(params.maxPrice) : undefined;
  const inStockOnly = params.inStockOnly === "true";
  const page = parseInt(params.page || "1", 10);
  const pageSize = 24;

  // Build Prisma where filter
  const where: any = {
    status: "ACTIVE",
    deletedAt: null,
  };

  if (categorySlug) {
    where.category = { slug: categorySlug };
  }

  if (brandSlug) {
    where.brand = { slug: brandSlug };
  }

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { description: { contains: search } },
      { brand: { name: { contains: search } } },
    ];
  }

  // Variant price & stock filtering
  if (minPrice !== undefined || maxPrice !== undefined || inStockOnly) {
    where.variants = {
      some: {
        ...(minPrice !== undefined && { price: { gte: minPrice } }),
        ...(maxPrice !== undefined && { price: { lte: maxPrice } }),
        ...(inStockOnly && { stock: { gt: 0 } }),
      },
    };
  }

  // Sorting logic (FR-CAT-03)
  let orderBy: any = { createdAt: "desc" };
  if (sort === "price-asc") {
    orderBy = { variants: { _count: "asc" } }; // or custom
  } else if (sort === "price-desc") {
    orderBy = { variants: { _count: "desc" } };
  } else if (sort === "name") {
    orderBy = { name: "asc" };
  }

  const [products, totalCount, categories, brands] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        brand: true,
        category: true,
        variants: true,
        images: { orderBy: { sortOrder: "asc" } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy,
    }),
    prisma.product.count({ where }),
    prisma.category.findMany({ where: { isActive: true } }),
    prisma.brand.findMany({ where: { isActive: true } }),
  ]);

  // Fallback for no-results (FR-CAT-06)
  const popularFallback =
    products.length === 0
      ? await prisma.product.findMany({
          where: { status: "ACTIVE" },
          include: {
            brand: true,
            category: true,
            variants: true,
            images: true,
          },
          take: 4,
        })
      : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">
            {search ? `Search results for "${search}"` : categorySlug ? `${categorySlug.toUpperCase()} Catalog` : "Explore All Products"}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Showing {products.length} of {totalCount} items
          </p>
        </div>

        {/* Sorting controls */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-500">Sort by:</span>
          <form method="GET" className="relative">
            {/* Preserve current params */}
            {categorySlug && <input type="hidden" name="category" value={categorySlug} />}
            {brandSlug && <input type="hidden" name="brand" value={brandSlug} />}
            {search && <input type="hidden" name="search" value={search} />}

            <select
              name="sort"
              defaultValue={sort}
              onChange={(e) => (e.target.form as any)?.submit()}
              className="pl-3 pr-8 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 cursor-pointer shadow-sm"
            >
              <option value="newest">Newest Arrivals</option>
              <option value="name">Alphabetical (A-Z)</option>
            </select>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 pt-8">
        {/* Left Filter Sidebar */}
        <aside className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                Filters
              </h3>
              {(categorySlug || brandSlug || search) && (
                <Link
                  href="/products"
                  className="text-[11px] font-bold text-rose-500 hover:underline flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </Link>
              )}
            </div>

            {/* Categories */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                Categories
              </h4>
              <div className="space-y-1">
                <Link
                  href="/products"
                  className={`block px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                    !categorySlug
                      ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  All Categories
                </Link>
                {categories.map((c) => (
                  <Link
                    key={c.id}
                    href={`/products?category=${c.slug}${brandSlug ? `&brand=${brandSlug}` : ""}`}
                    className={`block px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                      categorySlug === c.slug
                        ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Brands */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                Brands
              </h4>
              <div className="space-y-1">
                <Link
                  href={`/products${categorySlug ? `?category=${categorySlug}` : ""}`}
                  className={`block px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                    !brandSlug
                      ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  All Brands
                </Link>
                {brands.map((b) => (
                  <Link
                    key={b.id}
                    href={`/products?brand=${b.slug}${categorySlug ? `&category=${categorySlug}` : ""}`}
                    className={`block px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                      brandSlug === b.slug
                        ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    {b.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Product Grid */}
        <main className="lg:col-span-3">
          {products.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                No products match your criteria
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                We couldn't find any products matching your current filters. Try resetting filters or explore our popular products below.
              </p>
              <div className="pt-2">
                <Link
                  href="/products"
                  className="px-5 py-2.5 rounded-full bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 shadow-md shadow-indigo-600/20"
                >
                  Clear All Filters
                </Link>
              </div>

              {/* Popular recommendations fallback (FR-CAT-06) */}
              {popularFallback.length > 0 && (
                <div className="pt-10 border-t border-slate-100 dark:border-slate-800 text-left">
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white mb-4">
                    Popular Products You Might Like:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {popularFallback.map((p) => {
                      const defaultVariant = p.variants[0];
                      const primaryImg = p.images.find((img) => img.isPrimary)?.url || p.images[0]?.url;
                      return (
                        <ProductCard
                          key={p.id}
                          id={p.id}
                          name={p.name}
                          slug={p.slug}
                          brandName={p.brand?.name}
                          price={defaultVariant?.price || 0}
                          compareAtPrice={defaultVariant?.compareAtPrice}
                          imageUrl={primaryImg}
                          defaultVariantId={defaultVariant?.id || ""}
                          stock={defaultVariant?.stock || 0}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((p) => {
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
          )}
        </main>
      </div>
    </div>
  );
}
