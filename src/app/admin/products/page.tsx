import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { can, isAdminRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { queryProducts } from "@/lib/catalog-admin";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { btnPrimary } from "@/components/admin/ui/tokens";
import ProductListClient from "@/components/admin/catalog/ProductListClient";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || "";

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await getCurrentUser();
  if (!user || !isAdminRole(user.role) || !can(user.role, "inventory.view")) {
    redirect("/login?next=/admin/products");
  }
  const sp = await searchParams;
  const filters = {
    q: one(sp.q),
    status: one(sp.status),
    categoryId: one(sp.categoryId),
    brandId: one(sp.brandId),
    low: one(sp.low) === "1",
    deleted: one(sp.deleted) === "1",
    page: Number(one(sp.page)) || 1,
  };

  const [result, categories, brands] = await Promise.all([
    queryProducts({ ...filters, pageSize: 20 }),
    prisma.category.findMany({ select: { id: true, name: true, level: true }, orderBy: [{ level: "asc" }, { name: "asc" }] }),
    prisma.brand.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const products = result.products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    status: p.status,
    isFeatured: p.isFeatured,
    deleted: !!p.deletedAt,
    brand: p.brand?.name ?? null,
    category: p.category?.name ?? null,
    image: p.images[0]?.url ?? null,
    variants: p.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      title: v.title,
      price: v.price,
      compareAtPrice: v.compareAtPrice,
      stock: v.stock,
      reservedStock: v.reservedStock,
      lowStockThreshold: v.lowStockThreshold,
    })),
  }));

  const canManage = can(user.role, "products.manage");

  return (
    <div>
      <PageHeader
        title="Products & Stock"
        description={`${result.total} product${result.total === 1 ? "" : "s"}. Every stock change is recorded in the immutable inventory ledger.`}
        actions={
          canManage ? (
            <Link href="/admin/products/new" className={btnPrimary}>
              <Plus className="h-4 w-4" /> New product
            </Link>
          ) : undefined
        }
      />

      <ProductListClient
        products={products}
        total={result.total}
        page={result.page}
        pages={result.pages}
        filters={filters}
        categories={categories}
        brands={brands}
        canManage={canManage}
        canAdjust={can(user.role, "inventory.adjust")}
      />
    </div>
  );
}
