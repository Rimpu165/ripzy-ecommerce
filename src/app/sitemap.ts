import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, pages] = await Promise.all([
    prisma.product.findMany({ where: { status: "ACTIVE", deletedAt: null }, select: { slug: true, updatedAt: true } }),
    prisma.page.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true } }),
  ]);
  const base = env.siteUrl;
  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/products`, changeFrequency: "daily", priority: 0.9 },
    ...products.map((p) => ({ url: `${base}/products/${p.slug}`, lastModified: p.updatedAt, priority: 0.8 })),
    ...pages.map((p) => ({ url: `${base}/pages/${p.slug}`, lastModified: p.updatedAt, priority: 0.4 })),
  ];
}
