import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import BannersClient, { type BannerRow } from "@/components/admin/marketing/BannersClient";

export const dynamic = "force-dynamic";

export default async function AdminBannersPage() {
  if (!(await getAdminUser("banners.manage"))) redirect("/admin");

  const rows = await prisma.banner.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] });
  const banners: BannerRow[] = rows.map((b) => ({
    id: b.id,
    title: b.title,
    subtitle: b.subtitle,
    imageUrl: b.imageUrl,
    linkUrl: b.linkUrl,
    badge: b.badge,
    sortOrder: b.sortOrder,
    isActive: b.isActive,
    startsAt: b.startsAt.toISOString(),
    endsAt: b.endsAt ? b.endsAt.toISOString() : null,
  }));

  return <BannersClient banners={banners} />;
}
