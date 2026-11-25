import { prisma } from "@/lib/prisma";
import { ApiError, handler, ok, parseJson } from "@/lib/api";
import { audit } from "@/lib/audit";
import { invalidateCatalog, uniqueSlug } from "@/lib/catalog";
import { attributeSchema, dedupeValues, parseValues } from "./schema";

export const GET = handler({ permission: "catalog.manage" }, async () => {
  const rows = await prisma.productAttribute.findMany({ orderBy: { name: "asc" } });
  return ok({ attributes: rows.map((a) => ({ ...a, values: parseValues(a.values) })) });
});

export const POST = handler({ permission: "catalog.manage", limit: { max: 60, windowMs: 60_000 } }, async ({ user, req }) => {
  const input = await parseJson(req, attributeSchema);
  if (input.slug && (await prisma.productAttribute.findUnique({ where: { slug: input.slug } }))) {
    throw new ApiError(409, `Slug "${input.slug}" is already in use`);
  }
  const row = await prisma.productAttribute.create({
    data: {
      name: input.name,
      slug: input.slug || (await uniqueSlug("productAttribute", input.name)),
      values: JSON.stringify(dedupeValues(input.values)),
    },
  });
  await audit({ userId: user!.id, action: "CREATE", entityType: "ProductAttribute", entityId: row.id, newValues: row, req });
  invalidateCatalog();
  return ok({ attribute: { ...row, values: parseValues(row.values) } }, { status: 201 });
});
