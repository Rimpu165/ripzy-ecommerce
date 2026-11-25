import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { handler, parseJson, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { bannerSchema } from "@/lib/marketing-schemas";

export const GET = handler({ permission: "banners.manage" }, async () => {
  const banners = await prisma.banner.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] });
  return ok({ banners });
});

export const POST = handler({ permission: "banners.manage", limit: { max: 60, windowMs: 60_000 } }, async ({ user, req }) => {
  const d = await parseJson(req, bannerSchema);
  const banner = await prisma.banner.create({
    data: {
      title: d.title,
      subtitle: d.subtitle || null,
      imageUrl: d.imageUrl,
      linkUrl: d.linkUrl || null,
      badge: d.badge || null,
      sortOrder: d.sortOrder,
      isActive: d.isActive,
      startsAt: d.startsAt ?? new Date(),
      endsAt: d.endsAt,
    },
  });
  revalidateTag("banners", "max");
  await audit({ userId: user!.id, action: "CREATE", entityType: "Banner", entityId: banner.id, newValues: banner, req });
  return ok({ banner }, { status: 201 });
});
