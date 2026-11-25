import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { can, isAdminRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import ProductForm from "@/components/admin/catalog/ProductForm";
import { parseValues } from "@/app/api/admin/attributes/schema";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const user = await getCurrentUser();
  if (!user || !isAdminRole(user.role)) redirect("/login?next=/admin/products/new");
  if (!can(user.role, "products.manage")) redirect("/admin/products");

  const [categories, brands, attrs] = await Promise.all([
    prisma.category.findMany({ where: { isActive: true }, select: { id: true, name: true, level: true }, orderBy: [{ level: "asc" }, { name: "asc" }] }),
    prisma.brand.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.productAttribute.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <ProductForm
      categories={categories}
      brands={brands}
      attributes={attrs.map((a) => ({ id: a.id, name: a.name, values: parseValues(a.values) }))}
    />
  );
}
