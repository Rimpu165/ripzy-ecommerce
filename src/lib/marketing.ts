import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";

export interface PublicBanner {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  linkUrl: string | null;
  badge: string | null;
}

/** Active banners (schedule is applied per request, below, so the cache never serves expired ones). */
const loadActiveBanners = unstable_cache(
  async () => {
    const rows = await prisma.banner.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return rows.map((b) => ({
      id: b.id,
      title: b.title,
      subtitle: b.subtitle,
      imageUrl: b.imageUrl,
      linkUrl: b.linkUrl,
      badge: b.badge,
      startsAt: b.startsAt.toISOString(),
      endsAt: b.endsAt ? b.endsAt.toISOString() : null,
    }));
  },
  ["banners-active"],
  { tags: ["banners"], revalidate: 300 }
);

export async function getActiveBanners(): Promise<PublicBanner[]> {
  const now = Date.now();
  const rows = await loadActiveBanners();
  return rows
    .filter((b) => new Date(b.startsAt).getTime() <= now && (!b.endsAt || new Date(b.endsAt).getTime() > now))
    .map((b) => ({ id: b.id, title: b.title, subtitle: b.subtitle, imageUrl: b.imageUrl, linkUrl: b.linkUrl, badge: b.badge }));
}

export const getPublishedPages = unstable_cache(
  async () =>
    prisma.page.findMany({
      where: { isPublished: true },
      select: { id: true, title: true, slug: true },
      orderBy: { title: "asc" },
    }),
  ["pages-published"],
  { tags: ["pages"], revalidate: 300 }
);

export const getPageBySlug = unstable_cache(
  async (slug: string) =>
    prisma.page.findUnique({
      where: { slug },
      select: { title: true, slug: true, content: true, isPublished: true, updatedAt: true },
    }),
  ["page-by-slug"],
  { tags: ["pages"], revalidate: 300 }
);

/** Only allow same-site paths and http(s) URLs (blocks javascript:, data: …). */
export function isSafeUrl(u: string): boolean {
  return /^\/(?!\/)/.test(u) || /^https?:\/\//i.test(u);
}
