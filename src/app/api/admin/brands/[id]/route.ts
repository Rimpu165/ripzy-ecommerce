import { prisma } from "@/lib/prisma";
import { ApiError, handler, ok, parseJson } from "@/lib/api";
import { audit } from "@/lib/audit";
import { invalidateCatalog } from "@/lib/catalog";
import { brandSchema } from "../schema";

type P = { id: string };

export const PUT = handler<P>({ permission: "catalog.manage", limit: { max: 60, windowMs: 60_000 } }, async ({ user, req, params }) => {
  const input = await parseJson(req, brandSchema);
  const current = await prisma.brand.findUnique({ where: { id: params.id } });
  if (!current) throw new ApiError(404, "Brand not found");
  if (input.slug) {
    const clash = await prisma.brand.findFirst({ where: { slug: input.slug, id: { not: current.id } } });
    if (clash) throw new ApiError(409, `Slug "${input.slug}" is already in use`);
  }
  const brand = await prisma.brand.update({
    where: { id: current.id },
    data: {
      name: input.name,
      slug: input.slug || current.slug,
      logo: input.logo?.trim() || null,
      description: input.description?.trim() || null,
      isActive: input.isActive,
    },
  });
  await audit({ userId: user!.id, action: "UPDATE", entityType: "Brand", entityId: brand.id, oldValues: current, newValues: brand, req });
  invalidateCatalog();
  return ok({ brand });
});

export const DELETE = handler<P>({ permission: "catalog.manage" }, async ({ user, req, params }) => {
  const brand = await prisma.brand.findUnique({
    where: { id: params.id },
    include: { _count: { select: { products: true } } },
  });
  if (!brand) throw new ApiError(404, "Brand not found");
  if (brand._count.products > 0)
    throw new ApiError(409, `Cannot delete: ${brand._count.products} product(s) use this brand. Deactivate it instead.`);
  await prisma.brand.delete({ where: { id: brand.id } });
  await audit({ userId: user!.id, action: "DELETE", entityType: "Brand", entityId: brand.id, oldValues: brand, req });
  invalidateCatalog();
  return ok({ success: true });
});
