import { revalidateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handler, parseJson, ok, fail } from "@/lib/api";
import { audit } from "@/lib/audit";
import { pageSchema } from "@/lib/marketing-schemas";

type P = { id: string };

const toggleSchema = z.object({ isPublished: z.boolean() }).strict();

/** Full update, or `{ isPublished }` only for the publish toggle. */
export const PATCH = handler<P>(
  { permission: "pages.manage", limit: { max: 60, windowMs: 60_000 } },
  async ({ user, req, params }) => {
    const existing = await prisma.page.findUnique({ where: { id: params.id } });
    if (!existing) return fail(404, "Page not found.");

    const raw = await req.clone().json().catch(() => null);
    const isToggle = raw && typeof raw === "object" && Object.keys(raw).length === 1 && "isPublished" in raw;

    let data: { title?: string; slug?: string; content?: string; isPublished: boolean };
    if (isToggle) {
      data = { isPublished: (await parseJson(req, toggleSchema)).isPublished };
    } else {
      data = await parseJson(req, pageSchema);
      if (data.slug !== existing.slug && (await prisma.page.findUnique({ where: { slug: data.slug } }))) {
        return fail(409, `Slug "${data.slug}" is already in use.`);
      }
    }

    try {
      const page = await prisma.page.update({ where: { id: existing.id }, data });
      revalidateTag("pages", "max");
      await audit({ userId: user!.id, action: "UPDATE", entityType: "Page", entityId: page.id, oldValues: existing, newValues: page, req });
      return ok({ page });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return fail(409, "Slug is already in use.");
      throw e;
    }
  }
);

export const DELETE = handler<P>(
  { permission: "pages.manage", limit: { max: 30, windowMs: 60_000 } },
  async ({ user, req, params }) => {
    const existing = await prisma.page.findUnique({ where: { id: params.id } });
    if (!existing) return fail(404, "Page not found.");
    await prisma.page.delete({ where: { id: existing.id } });
    revalidateTag("pages", "max");
    await audit({ userId: user!.id, action: "DELETE", entityType: "Page", entityId: existing.id, oldValues: existing, req });
    return ok({ success: true });
  }
);
