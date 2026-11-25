import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handler, ok, parseJson } from "@/lib/api";
import { audit } from "@/lib/audit";
import { invalidateCatalog } from "@/lib/catalog";

const schema = z.object({
  ids: z.array(z.string().min(1)).min(1, "Select at least one product").max(200),
  action: z.enum(["archive", "activate", "draft", "delete", "restore"]),
});

export const POST = handler({ permission: "products.manage", limit: { max: 30, windowMs: 60_000 } }, async ({ user, req }) => {
  const { ids, action } = await parseJson(req, schema);
  const restoring = action === "restore";
  const products = await prisma.product.findMany({
    where: { id: { in: ids }, deletedAt: restoring ? { not: null } : null },
    select: { id: true, slug: true, status: true },
  });
  if (!products.length) return ok({ updated: 0 });
  const target = products.map((p) => p.id);

  const data =
    action === "archive" ? { status: "ARCHIVED" }
    : action === "activate" ? { status: "ACTIVE" }
    : action === "draft" ? { status: "DRAFT" }
    : action === "delete" ? { deletedAt: new Date(), status: "ARCHIVED" }
    : { deletedAt: null, status: "DRAFT" }; // restored products come back as drafts for review

  await prisma.product.updateMany({ where: { id: { in: target } }, data });
  await audit({
    userId: user!.id,
    action: action === "delete" ? "DELETE" : "STATUS_CHANGE",
    entityType: "Product",
    entityId: target.length === 1 ? target[0] : null,
    oldValues: products.map((p) => ({ id: p.id, status: p.status })),
    newValues: { action, ids: target },
    req,
  });
  invalidateCatalog(products.map((p) => p.slug));
  return ok({ updated: target.length });
});
