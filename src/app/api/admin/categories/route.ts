import { prisma } from "@/lib/prisma";
import { ApiError, handler, ok, parseJson } from "@/lib/api";
import { audit } from "@/lib/audit";
import { invalidateCatalog, uniqueSlug } from "@/lib/catalog";
import { categorySchema } from "./schema";

export const GET = handler({ permission: "catalog.manage" }, async () => {
  const categories = await prisma.category.findMany({
    include: { _count: { select: { products: true, children: true } } },
    orderBy: [{ level: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  });
  return ok({ categories });
});

export const POST = handler({ permission: "catalog.manage", limit: { max: 60, windowMs: 60_000 } }, async ({ user, req }) => {
  const input = await parseJson(req, categorySchema);

  let level = 1;
  if (input.parentId) {
    const parent = await prisma.category.findUnique({ where: { id: input.parentId } });
    if (!parent) throw new ApiError(400, "Parent category not found");
    level = parent.level + 1;
    if (level > 3) throw new ApiError(400, "Categories can be nested at most 3 levels deep");
  }

  if (input.slug && (await prisma.category.findUnique({ where: { slug: input.slug } }))) {
    throw new ApiError(409, `Slug "${input.slug}" is already in use`);
  }
  const slug = input.slug || (await uniqueSlug("category", input.name));

  const category = await prisma.category.create({
    data: {
      name: input.name,
      slug,
      description: input.description?.trim() || null,
      image: input.image?.trim() || null,
      parentId: input.parentId || null,
      level,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    },
  });
  await audit({ userId: user!.id, action: "CREATE", entityType: "Category", entityId: category.id, newValues: category, req });
  invalidateCatalog();
  return ok({ category }, { status: 201 });
});
