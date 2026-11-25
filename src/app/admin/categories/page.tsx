import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { can, isAdminRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { parseValues } from "@/app/api/admin/attributes/schema";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import CatalogManager from "@/components/admin/catalog/CatalogManager";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const user = await getCurrentUser();
  if (!user || !isAdminRole(user.role)) redirect("/login?next=/admin/categories");
  if (!can(user.role, "catalog.manage")) redirect("/admin");

  const [categories, brands, attributes] = await Promise.all([
    prisma.category.findMany({
      include: { _count: { select: { products: true, children: true } } },
      orderBy: [{ level: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.brand.findMany({ include: { _count: { select: { products: true } } }, orderBy: { name: "asc" } }),
    prisma.productAttribute.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader title="Categories, Brands & Attributes" description="Manage the catalog taxonomy used by products and storefront filters." />
      <CatalogManager
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          description: c.description,
          image: c.image,
          parentId: c.parentId,
          level: c.level,
          sortOrder: c.sortOrder,
          isActive: c.isActive,
          products: c._count.products,
          children: c._count.children,
        }))}
        brands={brands.map((b) => ({
          id: b.id,
          name: b.name,
          slug: b.slug,
          logo: b.logo,
          description: b.description,
          isActive: b.isActive,
          products: b._count.products,
        }))}
        attributes={attributes.map((a) => ({ id: a.id, name: a.name, slug: a.slug, values: parseValues(a.values) }))}
      />
    </div>
  );
}
