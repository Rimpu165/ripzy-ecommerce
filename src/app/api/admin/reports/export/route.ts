import { z } from "zod";
import { handler, fail } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { can } from "@/lib/rbac";
import { csvResponse } from "@/components/admin/insight/csv";

const TYPES = ["orders", "inventory", "tax", "products", "customers"] as const;
const PAID = ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"];
const day = (d: Date) => d.toISOString().slice(0, 10);

export const GET = handler({ permission: "reports.view", limit: { max: 15, windowMs: 60_000 } }, async ({ user, req }) => {
  const parsed = z.enum(TYPES).safeParse(new URL(req.url).searchParams.get("type") || "orders");
  if (!parsed.success) return fail(400, "Invalid report type.");
  const type = parsed.data;
  if (type === "customers" && !can(user!.role, "customers.view")) return fail(403, "Forbidden");

  let res: Response;
  let count = 0;

  if (type === "orders") {
    const orders = await prisma.order.findMany({ include: { user: true, payments: true, items: true }, orderBy: { createdAt: "desc" } });
    count = orders.length;
    res = csvResponse(
      "ripzy_orders",
      ["Order Number", "Date", "Customer Name", "Customer Email", "Status", "Payment Method", "Items Count", "Subtotal", "Discount", "Tax", "Grand Total"],
      orders.map((o) => {
        let shipping: { fullName?: string } = {};
        try { shipping = JSON.parse(o.shippingAddressJson); } catch { /* ignore */ }
        return [o.orderNumber, day(o.createdAt), shipping.fullName || o.user?.name || "Guest", o.user?.email || o.guestEmail || "", o.status, o.payments[0]?.paymentMethod || "COD", o.items.length, o.subtotal, o.discountTotal, o.taxTotal, o.grandTotal];
      })
    );
  } else if (type === "inventory") {
    const variants = await prisma.productVariant.findMany({ include: { product: true }, orderBy: { stock: "asc" } });
    count = variants.length;
    res = csvResponse(
      "ripzy_inventory",
      ["SKU", "Product Name", "Variant Option", "Unit Price", "Compare MRP", "Stock Available", "Reserved Stock", "Low Stock Threshold", "Total Inventory Value"],
      variants.map((v) => [v.sku, v.product.name, v.title, v.price, v.compareAtPrice || v.price, v.stock, v.reservedStock, v.lowStockThreshold, v.price * v.stock])
    );
  } else if (type === "tax") {
    const orders = await prisma.order.findMany({ where: { status: { in: PAID } }, orderBy: { createdAt: "desc" } });
    count = orders.length;
    res = csvResponse(
      "ripzy_gst_tax_report",
      ["Order Number", "Date", "Status", "Taxable Value (Subtotal - Discount)", "CGST", "SGST", "Total GST", "Invoice Grand Total"],
      orders.map((o) => [o.orderNumber, day(o.createdAt), o.status, Math.max(0, o.subtotal - o.discountTotal), o.taxTotal / 2, o.taxTotal / 2, o.taxTotal, o.grandTotal])
    );
  } else if (type === "products") {
    const products = await prisma.product.findMany({
      where: { deletedAt: null },
      include: { brand: true, category: true, variants: true },
      orderBy: { createdAt: "desc" },
    });
    const sold = await prisma.orderItem.groupBy({
      by: ["variantId"],
      where: { order: { status: { in: PAID } } },
      _sum: { quantity: true, totalPrice: true },
    });
    const soldMap = new Map(sold.map((s) => [s.variantId, s._sum]));
    count = products.length;
    res = csvResponse(
      "ripzy_products",
      ["Product", "Slug", "Status", "Brand", "Category", "Variants", "Min Price", "Max Price", "Total Stock", "Units Sold", "Revenue", "Created"],
      products.map((p) => {
        const prices = p.variants.map((v) => v.price);
        const units = p.variants.reduce((s, v) => s + (soldMap.get(v.id)?.quantity ?? 0), 0);
        const rev = p.variants.reduce((s, v) => s + (soldMap.get(v.id)?.totalPrice ?? 0), 0);
        return [p.name, p.slug, p.status, p.brand?.name ?? "", p.category?.name ?? "", p.variants.length, prices.length ? Math.min(...prices) : 0, prices.length ? Math.max(...prices) : 0, p.variants.reduce((s, v) => s + v.stock, 0), units, rev, day(p.createdAt)];
      })
    );
  } else {
    const users = await prisma.user.findMany({ where: { role: "CUSTOMER", deletedAt: null }, orderBy: { createdAt: "desc" } });
    const spend = await prisma.order.groupBy({
      by: ["userId"],
      where: { userId: { not: null }, status: { in: PAID } },
      _sum: { grandTotal: true },
      _count: { _all: true },
    });
    const m = new Map(spend.map((s) => [s.userId, s]));
    count = users.length;
    res = csvResponse(
      "ripzy_customers",
      ["Name", "Email", "Phone", "Status", "Paid Orders", "Lifetime Spend", "Joined", "Last Login"],
      users.map((u) => [u.name, u.email, u.phone ?? "", u.isBlocked ? "Blocked" : "Active", m.get(u.id)?._count._all ?? 0, m.get(u.id)?._sum.grandTotal ?? 0, day(u.createdAt), u.lastLoginAt ? day(u.lastLoginAt) : ""])
    );
  }

  await audit({ userId: user!.id, action: "EXPORT", entityType: "REPORT", entityId: type, newValues: { type, rows: count }, req });
  return res;
});
