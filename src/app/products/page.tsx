import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/ProductCard";
import ProductSortSelect from "@/components/ProductSortSelect";
import FilterDrawer from "@/components/store/FilterDrawer";
import { toCardProps } from "@/components/store/cardProps";
import { SlidersHorizontal, Search, RotateCcw, ChevronLeft, ChevronRight, X } from "lucide-react";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

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

export async function generateMetadata({ searchParams }: SearchProps): Promise<Metadata> {
  const p = await searchParams;
  const title = p.search ? `Search: ${p.search} | Ripzy` : p.category ? `${p.category} | Ripzy` : "All Products | Ripzy";
  const page = parseInt(p.page || "1", 10);
  return {
    title,
    description: "Browse the Ripzy catalog: electronics, audio, keyboards and more.",
    alternates: { canonical: "/products" + (page > 1 ? `?page=${page}` : "") },
    // Filtered/search views should not compete with the main listing in search engines.
    robots: p.search || p.minPrice || p.maxPrice || p.inStockOnly ? { index: false, follow: true } : undefined,
  };
}

const num = (v?: string) => {
  if (v === undefined || v === "") return undefined;
  const n = parseFloat(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

export default async function ProductsPage({ searchParams }: SearchProps) {
  const params = await searchParams;
  const categorySlug = params.category;
  const brandSlug = params.brand;
  const sort = ["newest", "name", "price-asc", "price-desc"].includes(params.sort || "") ? params.sort! : "newest";
  const search = params.search?.trim();
  const minPrice = num(params.minPrice);
  const maxPrice = num(params.maxPrice);
  const inStockOnly = params.inStockOnly === "true";
  const requestedPage = Math.max(1, parseInt(params.page || "1", 10) || 1);

  const where: Prisma.ProductWhereInput = { status: "ACTIVE", deletedAt: null };
  if (categorySlug) where.category = { slug: categorySlug };
  if (brandSlug) where.brand = { slug: brandSlug };
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { description: { contains: search } },
      { brand: { name: { contains: search } } },
    ];
  }
  if (minPrice !== undefined || maxPrice !== undefined || inStockOnly) {
    where.variants = {
      some: {
        ...((minPrice !== undefined || maxPrice !== undefined) && {
          price: {
            ...(minPrice !== undefined && { gte: minPrice }),
            ...(maxPrice !== undefined && { lte: maxPrice }),
          },
        }),
        ...(inStockOnly && { stock: { gt: 0 } }),
      },
    };
  }

  const include = {
    brand: true,
    category: true,
    variants: { orderBy: { price: "asc" as const } },
    images: { orderBy: { sortOrder: "asc" as const } },
  };

  const totalCount = await prisma.product.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const skip = (page - 1) * PAGE_SIZE;

  let products;
  if (sort === "price-asc" || sort === "price-desc") {
    // Price lives on variants, so sort on each product's cheapest variant.
    const priced = await prisma.product.findMany({
      where,
      select: { id: true, variants: { select: { price: true } } },
    });
    const ranked = priced
      .map((p) => ({ id: p.id, min: p.variants.length ? Math.min(...p.variants.map((v) => v.price)) : Infinity }))
      .sort((a, b) => (sort === "price-asc" ? a.min - b.min : b.min - a.min))
      .slice(skip, skip + PAGE_SIZE)
      .map((r) => r.id);
    const rows = await prisma.product.findMany({ where: { id: { in: ranked } }, include });
    products = ranked.map((id) => rows.find((r) => r.id === id)!).filter(Boolean);
  } else {
    products = await prisma.product.findMany({
      where,
      include,
      skip,
      take: PAGE_SIZE,
      orderBy: sort === "name" ? { name: "asc" } : { createdAt: "desc" },
    });
  }

  const [categories, brands, ratingRows] = await Promise.all([
    prisma.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.brand.findMany({ where: { isActive: true } }),
    products.length
      ? prisma.review.groupBy({
          by: ["productId"],
          where: { productId: { in: products.map((p) => p.id) }, status: "APPROVED" },
          _avg: { rating: true },
          _count: { rating: true },
        })
      : Promise.resolve([]),
  ]);
  const ratings = new Map(ratingRows.map((r) => [r.productId, { avg: r._avg.rating ?? 0, count: r._count.rating }]));

  const popularFallback =
    products.length === 0
      ? await prisma.product.findMany({ where: { status: "ACTIVE", deletedAt: null }, include, take: 4 })
      : [];

  /** Build a /products URL that keeps the current filters, overriding some keys. */
  const href = (over: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    const base: Record<string, string | undefined> = {
      category: categorySlug,
      brand: brandSlug,
      search,
      sort: sort !== "newest" ? sort : undefined,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      inStockOnly: inStockOnly ? "true" : undefined,
      page: undefined,
      ...over,
    };
    for (const [k, v] of Object.entries(base)) if (v) q.set(k, v);
    const s = q.toString();
    return `/products${s ? `?${s}` : ""}`;
  };

  const toCard = (p: (typeof products)[number]) => {
    const r = ratings.get(p.id);
    return <ProductCard key={p.id} {...toCardProps(p, r)} />;
  };

  const activeLink = "bg-indigo-50 text-indigo-700 font-semibold";
  const idleLink = "text-slate-600 hover:bg-slate-50";
  const hasFilters = !!(categorySlug || brandSlug || search || minPrice !== undefined || maxPrice !== undefined || inStockOnly);
  const from = totalCount === 0 ? 0 : skip + 1;
  const to = Math.min(skip + PAGE_SIZE, totalCount);

  const categoryName = categories.find((c) => c.slug === categorySlug)?.name ?? categorySlug;
  const brandName = brands.find((b) => b.slug === brandSlug)?.name ?? brandSlug;
  const chips: { label: string; remove: string }[] = [];
  if (categorySlug) chips.push({ label: `Category: ${categoryName}`, remove: href({ category: undefined }) });
  if (brandSlug) chips.push({ label: `Brand: ${brandName}`, remove: href({ brand: undefined }) });
  if (search) chips.push({ label: `Search: ${search}`, remove: href({ search: undefined }) });
  if (minPrice !== undefined) chips.push({ label: `Min ₹${minPrice}`, remove: href({ minPrice: undefined }) });
  if (maxPrice !== undefined) chips.push({ label: `Max ₹${maxPrice}`, remove: href({ maxPrice: undefined }) });
  if (inStockOnly) chips.push({ label: "In stock only", remove: href({ inStockOnly: undefined }) });

  const pageBtn = "inline-flex min-w-9 items-center justify-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors";

  return (
    <div className="container-page py-6 sm:py-8">
      <nav aria-label="Breadcrumb" className="mb-3 text-xs text-slate-500">
        <ol className="flex items-center gap-1.5">
          <li><Link href="/" className="hover:text-indigo-600">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-slate-700">Products</li>
        </ol>
      </nav>

      <div className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-5 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
            {search ? `Results for "${search}"` : categorySlug ? categoryName : "All products"}
          </h1>
          <p className="mt-1 text-sm text-slate-500" aria-live="polite">
            {totalCount === 0 ? "No items" : `Showing ${from}-${to} of ${totalCount} items`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="sort-select" className="text-sm text-slate-500">
            Sort by
          </label>
          <ProductSortSelect currentSort={sort} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 pt-6 lg:grid-cols-[240px_1fr] lg:gap-8">
        <FilterDrawer activeCount={chips.length}>
          <div className="card space-y-5 p-5">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <SlidersHorizontal className="h-4 w-4 text-indigo-600" />
                Filters
              </h2>
              {hasFilters && (
                <Link href="/products" className="flex items-center gap-1 text-xs font-semibold text-rose-600 hover:underline">
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </Link>
              )}
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Categories</h3>
              <div className="space-y-0.5">
                <Link href={href({ category: undefined })} className={`block rounded-lg px-3 py-1.5 text-sm transition-colors ${!categorySlug ? activeLink : idleLink}`}>
                  All categories
                </Link>
                {categories.map((c) => (
                  <Link key={c.id} href={href({ category: c.slug })} className={`block rounded-lg px-3 py-1.5 text-sm transition-colors ${categorySlug === c.slug ? activeLink : idleLink}`}>
                    {c.name}
                  </Link>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Brands</h3>
              <div className="space-y-0.5">
                <Link href={href({ brand: undefined })} className={`block rounded-lg px-3 py-1.5 text-sm transition-colors ${!brandSlug ? activeLink : idleLink}`}>
                  All brands
                </Link>
                {brands.map((b) => (
                  <Link key={b.id} href={href({ brand: b.slug })} className={`block rounded-lg px-3 py-1.5 text-sm transition-colors ${brandSlug === b.slug ? activeLink : idleLink}`}>
                    {b.name}
                  </Link>
                ))}
              </div>
            </div>

            <div className="space-y-3 border-t border-slate-100 pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Availability &amp; price</h3>
              <Link href={href({ inStockOnly: inStockOnly ? undefined : "true" })} className={`block rounded-lg px-3 py-1.5 text-sm transition-colors ${inStockOnly ? activeLink : idleLink}`}>
                {inStockOnly ? "✓ " : ""}In stock only
              </Link>
              <form action="/products" method="get" className="space-y-2">
                {categorySlug && <input type="hidden" name="category" value={categorySlug} />}
                {brandSlug && <input type="hidden" name="brand" value={brandSlug} />}
                {search && <input type="hidden" name="search" value={search} />}
                {sort !== "newest" && <input type="hidden" name="sort" value={sort} />}
                {inStockOnly && <input type="hidden" name="inStockOnly" value="true" />}
                <div className="flex gap-2">
                  <input name="minPrice" type="number" min={0} inputMode="numeric" defaultValue={params.minPrice} placeholder="Min ₹" aria-label="Minimum price" className="input w-1/2 px-2.5 py-1.5" />
                  <input name="maxPrice" type="number" min={0} inputMode="numeric" defaultValue={params.maxPrice} placeholder="Max ₹" aria-label="Maximum price" className="input w-1/2 px-2.5 py-1.5" />
                </div>
                <button type="submit" className="btn-primary w-full py-2">
                  Apply price
                </button>
              </form>
            </div>
          </div>
        </FilterDrawer>

        <main>
          {chips.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2" aria-label="Active filters">
              {chips.map((c) => (
                <Link
                  key={c.label}
                  href={c.remove}
                  className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                  aria-label={`Remove filter ${c.label}`}
                >
                  {c.label}
                  <X className="h-3 w-3" />
                </Link>
              ))}
              <Link href="/products" className="text-xs font-semibold text-slate-500 hover:text-slate-700 hover:underline">
                Clear all
              </Link>
            </div>
          )}

          {products.length === 0 ? (
            <div className="card space-y-4 p-8 text-center sm:p-12">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Search className="h-7 w-7" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">No products match your criteria</h2>
              <p className="mx-auto max-w-sm text-sm text-slate-500">
                We could not find any products matching your current filters. Try resetting filters or explore our popular products below.
              </p>
              <Link href="/products" className="btn-primary">
                Clear all filters
              </Link>
              {popularFallback.length > 0 && (
                <div className="border-t border-slate-100 pt-8 text-left">
                  <h3 className="mb-4 text-base font-semibold text-slate-900">Popular products you might like</h3>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{popularFallback.map(toCard)}</div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3">{products.map(toCard)}</div>

              {totalPages > 1 && (
                <nav aria-label="Pagination" className="flex flex-wrap items-center justify-center gap-2 pt-10">
                  {page > 1 ? (
                    <Link href={href({ page: String(page - 1) })} rel="prev" className={`${pageBtn} border-slate-200 bg-white text-slate-700 hover:border-indigo-300`}>
                      <ChevronLeft className="h-4 w-4" /> Prev
                    </Link>
                  ) : null}
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 2)
                    .map((n, i, arr) => (
                      <React.Fragment key={n}>
                        {i > 0 && n - arr[i - 1] > 1 && <span className="text-slate-400">…</span>}
                        <Link
                          href={href({ page: n > 1 ? String(n) : undefined })}
                          aria-current={n === page ? "page" : undefined}
                          className={`${pageBtn} ${
                            n === page
                              ? "border-indigo-600 bg-indigo-600 text-white"
                              : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300"
                          }`}
                        >
                          {n}
                        </Link>
                      </React.Fragment>
                    ))}
                  {page < totalPages ? (
                    <Link href={href({ page: String(page + 1) })} rel="next" className={`${pageBtn} border-slate-200 bg-white text-slate-700 hover:border-indigo-300`}>
                      Next <ChevronRight className="h-4 w-4" />
                    </Link>
                  ) : null}
                </nav>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
