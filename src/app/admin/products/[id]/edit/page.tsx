import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { can, isAdminRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import ProductForm from "@/components/admin/catalog/ProductForm";
import { parseValues } from "@/app/api/admin/attributes/schema";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || !isAdminRole(user.role)) redirect(`/login?next=/admin/products/${id}/edit`);
  if (!can(user.role, "products.manage")) redirect("/admin/products");

  const product = await prisma.product.findFirst({
    where: { id, deletedAt: null },
    include: {
      variants: { orderBy: { createdAt: "asc" }, include: { _count: { select: { orderItems: true } } } },
      images: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!product) notFound();

  const [categories, brands, attrs] = await Promise.all([
    prisma.category.findMany({ select: { id: true, name: true, level: true }, orderBy: [{ level: "asc" }, { name: "asc" }] }),
    prisma.brand.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.productAttribute.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <ProductForm
      categories={categories}
      brands={brands}
      attributes={attrs.map((a) => ({ id: a.id, name: a.name, values: parseValues(a.values) }))}
      initial={{
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        shortDescription: product.shortDescription,
        brandId: product.brandId,
        categoryId: product.categoryId,
        taxRate: product.taxRate,
        status: product.status,
        isFeatured: product.isFeatured,
        metaTitle: product.metaTitle,
        metaDescription: product.metaDescription,
        variants: product.variants.map((v) => ({
          id: v.id,
          sku: v.sku,
          title: v.title,
          price: v.price,
          compareAtPrice: v.compareAtPrice,
          stock: v.stock,
          reservedStock: v.reservedStock,
          lowStockThreshold: v.lowStockThreshold,
          attributes: v.attributes,
          orderRefs: v._count.orderItems,
        })),
        images: product.images.map((i) => ({ url: i.url, altText: i.altText, isPrimary: i.isPrimary })),
      }}
    />
  );
}
