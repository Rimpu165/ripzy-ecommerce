import { prisma } from "@/lib/prisma";
import { ApiError, handler, ok, parseJson } from "@/lib/api";
import { audit } from "@/lib/audit";
import { invalidateCatalog } from "@/lib/catalog";
import { attributeSchema, dedupeValues, parseValues } from "../schema";

type P = { id: string };

export const PUT = handler<P>({ permission: "catalog.manage", limit: { max: 60, windowMs: 60_000 } }, async ({ user, req, params }) => {
  const input = await parseJson(req, attributeSchema);
  const current = await prisma.productAttribute.findUnique({ where: { id: params.id } });
  if (!current) throw new ApiError(404, "Attribute not found");
  if (input.slug) {
    const clash = await prisma.productAttribute.findFirst({ where: { slug: input.slug, id: { not: current.id } } });
    if (clash) throw new ApiError(409, `Slug "${input.slug}" is already in use`);
  }
  const row = await prisma.productAttribute.update({
    where: { id: current.id },
    data: { name: input.name, slug: input.slug || current.slug, values: JSON.stringify(dedupeValues(input.values)) },
  });
  await audit({ userId: user!.id, action: "UPDATE", entityType: "ProductAttribute", entityId: row.id, oldValues: current, newValues: row, req });
  invalidateCatalog();
  return ok({ attribute: { ...row, values: parseValues(row.values) } });
});

export const DELETE = handler<P>({ permission: "catalog.manage" }, async ({ user, req, params }) => {
  const current = await prisma.productAttribute.findUnique({ where: { id: params.id } });
  if (!current) throw new ApiError(404, "Attribute not found");
  await prisma.productAttribute.delete({ where: { id: current.id } });
  await audit({ userId: user!.id, action: "DELETE", entityType: "ProductAttribute", entityId: current.id, oldValues: current, req });
  invalidateCatalog();
  return ok({ success: true });
});
