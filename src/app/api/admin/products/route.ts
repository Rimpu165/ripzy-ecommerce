import { z } from "zod";
import { handler, ok, parseJson } from "@/lib/api";
import { audit } from "@/lib/audit";
import { invalidateCatalog } from "@/lib/catalog";
import { queryProducts } from "@/lib/catalog-admin";
import { productSchema, saveProduct } from "./service";

const csvCell = (v: unknown) => {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // spreadsheet formula injection guard
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const querySchema = z.object({
  q: z.string().optional(),
  status: z.string().optional(),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  low: z.string().optional(),
  deleted: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  format: z.enum(["json", "csv"]).optional(),
});

export const GET = handler({ permission: "inventory.view" }, async ({ user, req }) => {
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const q = querySchema.parse(sp);
  const result = await queryProducts({ ...q, low: q.low === "1", deleted: q.deleted === "1" }, q.format !== "csv");

  if (q.format === "csv") {
    const header = ["Product", "Slug", "Status", "Brand", "Category", "SKU", "Variant", "Price", "MRP", "Stock", "Reserved", "LowStockThreshold"];
    const lines = [header.join(",")];
    for (const p of result.products) {
      for (const v of p.variants) {
        lines.push(
          [p.name, p.slug, p.status, p.brand?.name, p.category?.name, v.sku, v.title, v.price, v.compareAtPrice, v.stock, v.reservedStock, v.lowStockThreshold]
            .map(csvCell)
            .join(",")
        );
      }
    }
    await audit({ userId: user?.id, action: "EXPORT", entityType: "Product", newValues: { rows: lines.length - 1 }, req });
    return new Response(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="products-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }
  return ok(result);
});

export const POST = handler({ permission: "products.manage", limit: { max: 60, windowMs: 60_000 } }, async ({ user, req }) => {
  const input = await parseJson(req, productSchema);
  const { product } = await saveProduct(input, `${user!.name} (${user!.role})`);
  await audit({
    userId: user!.id,
    action: "CREATE",
    entityType: "Product",
    entityId: product.id,
    newValues: { name: product.name, slug: product.slug, status: product.status, variants: input.variants.map((v) => v.sku) },
    req,
  });
  invalidateCatalog(product.slug);
  return ok({ id: product.id, slug: product.slug }, { status: 201 });
});
