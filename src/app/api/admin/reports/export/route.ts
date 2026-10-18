import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !["MANAGER", "SUPER_ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "orders";

    if (type === "orders") {
      const orders = await prisma.order.findMany({
        include: { user: true, payments: true, items: true },
        orderBy: { createdAt: "desc" },
      });

      let csv = "Order Number,Date,Customer Name,Customer Email,Status,Payment Method,Items Count,Subtotal,Discount,Tax,Grand Total\n";
      for (const o of orders) {
        let shipping: any = {};
        try { shipping = JSON.parse(o.shippingAddressJson); } catch {}
        const name = `"${(shipping.fullName || o.user?.name || 'Guest').replace(/"/g, '""')}"`;
        const email = `"${(o.user?.email || o.guestEmail || '').replace(/"/g, '""')}"`;
        const date = new Date(o.createdAt).toISOString().split("T")[0];
        const payMethod = o.payments?.[0]?.paymentMethod || "COD";
        csv += `${o.orderNumber},${date},${name},${email},${o.status},${payMethod},${o.items.length},${o.subtotal},${o.discountTotal},${o.taxTotal},${o.grandTotal}\n`;
      }

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="ripzy_orders_${Date.now()}.csv"`,
        },
      });
    }

    if (type === "inventory") {
      const variants = await prisma.productVariant.findMany({
        include: { product: true },
        orderBy: { stock: "asc" },
      });

      let csv = "SKU,Product Name,Variant Option,Unit Price,Compare MRP,Stock Available,Reserved Stock,Total Inventory Value\n";
      for (const v of variants) {
        const prodName = `"${v.product.name.replace(/"/g, '""')}"`;
        const varTitle = `"${v.title.replace(/"/g, '""')}"`;
        const value = v.price * v.stock;
        csv += `${v.sku},${prodName},${varTitle},${v.price},${v.compareAtPrice || v.price},${v.stock},${v.reservedStock},${value}\n`;
      }

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="ripzy_inventory_${Date.now()}.csv"`,
        },
      });
    }

    if (type === "tax") {
      const orders = await prisma.order.findMany({
        where: { status: { in: ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"] } },
        orderBy: { createdAt: "desc" },
      });

      let csv = "Order Number,Date,Status,Taxable Value (Subtotal - Discount),CGST (9%),SGST (9%),Total GST (18%),Invoice Grand Total\n";
      for (const o of orders) {
        const date = new Date(o.createdAt).toISOString().split("T")[0];
        const taxable = Math.max(0, o.subtotal - o.discountTotal);
        const cgst = o.taxTotal / 2;
        const sgst = o.taxTotal / 2;
        csv += `${o.orderNumber},${date},${o.status},${taxable},${cgst},${sgst},${o.taxTotal},${o.grandTotal}\n`;
      }

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="ripzy_gst_tax_report_${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
  } catch (error) {
    console.error("CSV Export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
