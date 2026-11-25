import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export interface ProductQuery {
  q?: string;
  status?: string;
  categoryId?: string;
  brandId?: string;
  low?: boolean;
  deleted?: boolean;
  page?: number;
  pageSize?: number;
}

export const PRODUCT_STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;

/** Admin product listing shared by the /admin/products page and the CSV export. */
export async function queryProducts(p: ProductQuery, paginate = true) {
  const where: Prisma.ProductWhereInput = { deletedAt: p.deleted ? { not: null } : null };
  if (p.q?.trim()) {
    const q = p.q.trim();
    where.OR = [
      { name: { contains: q } },
      { slug: { contains: q } },
      { variants: { some: { sku: { contains: q } } } },
    ];
  }
  if (p.status && (PRODUCT_STATUSES as readonly string[]).includes(p.status)) where.status = p.status;
  if (p.categoryId) where.categoryId = p.categoryId;
  if (p.brandId) where.brandId = p.brandId;
  if (p.low) {
    const rows = await prisma.$queryRaw<{ productId: string }[]>`
      SELECT DISTINCT productId FROM product_variants WHERE (stock - reservedStock) <= lowStockThreshold`;
    where.id = { in: rows.map((r) => r.productId) };
  }

  const pageSize = Math.min(Math.max(p.pageSize ?? 20, 1), 100);
  const page = Math.max(p.page ?? 1, 1);

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: {
        brand: { select: { name: true } },
        category: { select: { name: true } },
        variants: { orderBy: { price: "asc" } },
        images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1 },
      },
      orderBy: { createdAt: "desc" },
      ...(paginate ? { skip: (page - 1) * pageSize, take: pageSize } : {}),
    }),
  ]);
  return { total, page, pageSize, pages: Math.max(Math.ceil(total / pageSize), 1), products };
}
