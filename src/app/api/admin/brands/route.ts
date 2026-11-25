import { prisma } from "@/lib/prisma";
import { ApiError, handler, ok, parseJson } from "@/lib/api";
import { audit } from "@/lib/audit";
import { invalidateCatalog, uniqueSlug } from "@/lib/catalog";
import { brandSchema } from "./schema";

export const GET = handler({ permission: "catalog.manage" }, async () => {
  const brands = await prisma.brand.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });
  return ok({ brands });
});

export const POST = handler({ permission: "catalog.manage", limit: { max: 60, windowMs: 60_000 } }, async ({ user, req }) => {
  const input = await parseJson(req, brandSchema);
  if (input.slug && (await prisma.brand.findUnique({ where: { slug: input.slug } }))) {
    throw new ApiError(409, `Slug "${input.slug}" is already in use`);
  }
  const brand = await prisma.brand.create({
    data: {
      name: input.name,
      slug: input.slug || (await uniqueSlug("brand", input.name)),
      logo: input.logo?.trim() || null,
      description: input.description?.trim() || null,
      isActive: input.isActive,
    },
  });
  await audit({ userId: user!.id, action: "CREATE", entityType: "Brand", entityId: brand.id, newValues: brand, req });
  invalidateCatalog();
  return ok({ brand }, { status: 201 });
});
