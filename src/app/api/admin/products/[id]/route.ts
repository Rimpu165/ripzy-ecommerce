import { prisma } from "@/lib/prisma";
import { ApiError, handler, ok, parseJson } from "@/lib/api";
import { audit } from "@/lib/audit";
import { invalidateCatalog } from "@/lib/catalog";
import { productSchema, saveProduct } from "../service";

type P = { id: string };

export const GET = handler<P>({ permission: "products.manage" }, async ({ params }) => {
  const product = await prisma.product.findFirst({
    where: { id: params.id },
    include: { variants: { orderBy: { createdAt: "asc" } }, images: { orderBy: { sortOrder: "asc" } } },
  });
  if (!product) throw new ApiError(404, "Product not found");
  return ok(product);
});

export const PUT = handler<P>({ permission: "products.manage", limit: { max: 60, windowMs: 60_000 } }, async ({ user, req, params }) => {
  const input = await parseJson(req, productSchema);
  const before = await prisma.product.findUnique({
    where: { id: params.id },
    select: { name: true, slug: true, status: true, taxRate: true, isFeatured: true },
  });
  const { product, previousSlug } = await saveProduct(input, `${user!.name} (${user!.role})`, params.id);
  await audit({
    userId: user!.id,
    action: before?.status !== product.status ? "STATUS_CHANGE" : "UPDATE",
    entityType: "Product",
    entityId: product.id,
    oldValues: before,
    newValues: { name: product.name, slug: product.slug, status: product.status, taxRate: product.taxRate, variants: input.variants.map((v) => v.sku) },
    req,
  });
  invalidateCatalog([product.slug, ...(previousSlug && previousSlug !== product.slug ? [previousSlug] : [])]);
  return ok({ id: product.id, slug: product.slug });
});

/** Soft delete (Golden Rule 11): sets deletedAt, keeps order history intact. */
export const DELETE = handler<P>({ permission: "products.manage" }, async ({ user, req, params }) => {
  const product = await prisma.product.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!product) throw new ApiError(404, "Product not found");
  await prisma.product.update({ where: { id: product.id }, data: { deletedAt: new Date(), status: "ARCHIVED" } });
  await audit({ userId: user!.id, action: "DELETE", entityType: "Product", entityId: product.id, oldValues: { name: product.name, status: product.status }, req });
  invalidateCatalog(product.slug);
  return ok({ success: true });
});
