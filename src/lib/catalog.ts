import { unstable_cache, revalidateTag, revalidatePath } from "next/cache";
import { prisma } from "./prisma";

/**
 * Cached storefront catalog reads + the single invalidation entry point.
 * NOTE: unstable_cache serialises to JSON, so Date fields come back as ISO strings.
 */

const productInclude = {
  brand: true,
  category: true,
  variants: true,
  images: { orderBy: { sortOrder: "asc" as const } },
};

export const getFeaturedProducts = unstable_cache(
  async (take = 8) =>
    prisma.product.findMany({
      where: { status: "ACTIVE", deletedAt: null },
      include: productInclude,
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      take,
    }),
  ["catalog-featured"],
  { tags: ["catalog"], revalidate: 300 }
);

export const getCategories = unstable_cache(
  async (take?: number) =>
    prisma.category.findMany({
      where: { isActive: true },
      include: { _count: { select: { products: true } } },
      orderBy: [{ level: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      take,
    }),
  ["catalog-categories"],
  { tags: ["catalog"], revalidate: 300 }
);

export const getBrands = unstable_cache(
  async () =>
    prisma.brand.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ["catalog-brands"],
  { tags: ["catalog"], revalidate: 300 }
);

export function getProductBySlug(slug: string) {
  return unstable_cache(
    async () =>
      prisma.product.findFirst({
        where: { slug, status: "ACTIVE", deletedAt: null },
        include: productInclude,
      }),
    ["catalog-product", slug],
    { tags: ["catalog", `product:${slug}`], revalidate: 300 }
  )();
}

/** Call from EVERY catalog mutation (products, categories, brands, stock). */
export function invalidateCatalog(slug?: string | string[]) {
  revalidateTag("catalog", "max");
  const slugs = Array.isArray(slug) ? slug : slug ? [slug] : [];
  for (const s of slugs) {
    revalidateTag(`product:${s}`, "max");
    revalidatePath(`/products/${s}`);
  }
  revalidatePath("/");
  revalidatePath("/products");
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

type SlugModel = "product" | "category" | "brand" | "productAttribute";

/** Returns `base`, or `base-2`, `base-3`... — first slug not used by another row. */
export async function uniqueSlug(model: SlugModel, input: string, excludeId?: string): Promise<string> {
  const base = slugify(input) || "item";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const delegate = (prisma as any)[model] as { findFirst: (a: unknown) => Promise<{ id: string } | null> };
  let candidate = base;
  for (let i = 2; i < 500; i++) {
    const hit = await delegate.findFirst({
      where: { slug: candidate, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    });
    if (!hit) return candidate;
    candidate = `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
}

/** Top-level active categories for the storefront navbar/footer (cached, tag "catalog"). */
export const getNavCategories = unstable_cache(
  async () =>
    prisma.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      take: 8,
      select: { id: true, name: true, slug: true },
    }),
  ["nav-categories"],
  { tags: ["catalog"], revalidate: 300 }
);
