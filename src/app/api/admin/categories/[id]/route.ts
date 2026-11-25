import { prisma } from "@/lib/prisma";
import { ApiError, handler, ok, parseJson } from "@/lib/api";
import { audit } from "@/lib/audit";
import { invalidateCatalog, uniqueSlug } from "@/lib/catalog";
import { categorySchema } from "../schema";

type P = { id: string };

export const PUT = handler<P>({ permission: "catalog.manage", limit: { max: 60, windowMs: 60_000 } }, async ({ user, req, params }) => {
  const input = await parseJson(req, categorySchema);
  const all = await prisma.category.findMany();
  const byId = new Map(all.map((c) => [c.id, c]));
  const current = byId.get(params.id);
  if (!current) throw new ApiError(404, "Category not found");

  // Subtree of this category (for cycle + depth checks, and level cascade)
  const descendants: { id: string; depthBelow: number }[] = [];
  const walk = (id: string, depth: number) => {
    for (const c of all) {
      if (c.parentId === id) {
        descendants.push({ id: c.id, depthBelow: depth });
        walk(c.id, depth + 1);
      }
    }
  };
  walk(current.id, 1);

  const newParentId = input.parentId || null;
  let newLevel = 1;
  if (newParentId) {
    if (newParentId === current.id || descendants.some((d) => d.id === newParentId)) {
      throw new ApiError(400, "A category cannot be moved under itself or one of its own sub-categories");
    }
    const parent = byId.get(newParentId);
    if (!parent) throw new ApiError(400, "Parent category not found");
    newLevel = parent.level + 1;
  }
  const maxDepthBelow = descendants.reduce((m, d) => Math.max(m, d.depthBelow), 0);
  if (newLevel + maxDepthBelow > 3) throw new ApiError(400, "This move would nest categories deeper than 3 levels");

  if (input.slug) {
    const clash = await prisma.category.findFirst({ where: { slug: input.slug, id: { not: current.id } } });
    if (clash) throw new ApiError(409, `Slug "${input.slug}" is already in use`);
  }
  const slug = input.slug || current.slug || (await uniqueSlug("category", input.name, current.id));

  const updated = await prisma.$transaction(async (tx) => {
    const c = await tx.category.update({
      where: { id: current.id },
      data: {
        name: input.name,
        slug,
        description: input.description?.trim() || null,
        image: input.image?.trim() || null,
        parentId: newParentId,
        level: newLevel,
        sortOrder: input.sortOrder,
        isActive: input.isActive,
      },
    });
    if (newLevel !== current.level) {
      for (const d of descendants) {
        await tx.category.update({ where: { id: d.id }, data: { level: newLevel + d.depthBelow } });
      }
    }
    return c;
  });

  await audit({ userId: user!.id, action: "UPDATE", entityType: "Category", entityId: current.id, oldValues: current, newValues: updated, req });
  invalidateCatalog();
  return ok({ category: updated });
});

export const DELETE = handler<P>({ permission: "catalog.manage" }, async ({ user, req, params }) => {
  const category = await prisma.category.findUnique({
    where: { id: params.id },
    include: { _count: { select: { products: true, children: true } } },
  });
  if (!category) throw new ApiError(404, "Category not found");
  if (category._count.products > 0)
    throw new ApiError(409, `Cannot delete: ${category._count.products} product(s) use this category. Deactivate it instead.`);
  if (category._count.children > 0)
    throw new ApiError(409, `Cannot delete: it has ${category._count.children} sub-categor${category._count.children === 1 ? "y" : "ies"}. Deactivate it instead.`);

  await prisma.category.delete({ where: { id: category.id } });
  await audit({ userId: user!.id, action: "DELETE", entityType: "Category", entityId: category.id, oldValues: category, req });
  invalidateCatalog();
  return ok({ success: true });
});
