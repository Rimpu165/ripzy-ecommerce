import { revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handler, parseJson, ok, fail } from "@/lib/api";
import { audit } from "@/lib/audit";
import { bannerSchema } from "@/lib/marketing-schemas";

type P = { id: string };

const toggleSchema = z.object({ isActive: z.boolean() }).strict();

/** Full update, or `{ isActive }` only for the quick toggle. */
export const PATCH = handler<P>(
  { permission: "banners.manage", limit: { max: 60, windowMs: 60_000 } },
  async ({ user, req, params }) => {
    const existing = await prisma.banner.findUnique({ where: { id: params.id } });
    if (!existing) return fail(404, "Banner not found.");

    const raw = await req.clone().json().catch(() => null);
    const isToggle = raw && typeof raw === "object" && Object.keys(raw).length === 1 && "isActive" in raw;

    const data = isToggle
      ? { isActive: (await parseJson(req, toggleSchema)).isActive }
      : await (async () => {
          const d = await parseJson(req, bannerSchema);
          return {
            title: d.title,
            subtitle: d.subtitle || null,
            imageUrl: d.imageUrl,
            linkUrl: d.linkUrl || null,
            badge: d.badge || null,
            sortOrder: d.sortOrder,
            isActive: d.isActive,
            startsAt: d.startsAt ?? existing.startsAt,
            endsAt: d.endsAt,
          };
        })();

    const banner = await prisma.banner.update({ where: { id: existing.id }, data });
    revalidateTag("banners", "max");
    await audit({ userId: user!.id, action: "UPDATE", entityType: "Banner", entityId: banner.id, oldValues: existing, newValues: banner, req });
    return ok({ banner });
  }
);

export const DELETE = handler<P>(
  { permission: "banners.manage", limit: { max: 30, windowMs: 60_000 } },
  async ({ user, req, params }) => {
    const existing = await prisma.banner.findUnique({ where: { id: params.id } });
    if (!existing) return fail(404, "Banner not found.");
    await prisma.banner.delete({ where: { id: existing.id } });
    revalidateTag("banners", "max");
    await audit({ userId: user!.id, action: "DELETE", entityType: "Banner", entityId: existing.id, oldValues: existing, req });
    return ok({ success: true });
  }
);
