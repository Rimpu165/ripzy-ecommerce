import { handler, fail } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { parseAddress } from "@/lib/orders";

const h = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Standalone printable packing slip (no prices), opened in a new tab. */
export const GET = handler<{ id: string }>({ permission: "orders.view" }, async ({ params }) => {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { items: true, user: { select: { name: true, phone: true } } },
  });
  if (!order) return fail(404, "Order not found");
  const a = parseAddress(order.shippingAddressJson);
  const rows = order.items
    .map((i) => `<tr><td>${h(i.productName)} <small>(${h(i.variantTitle)})</small></td><td>${h(i.sku)}</td><td class="q">${i.quantity}</td></tr>`)
    .join("");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Packing slip ${h(order.orderNumber)}</title>
<style>body{font-family:Arial,sans-serif;margin:32px;color:#111}h1{margin:0 0 4px}table{width:100%;border-collapse:collapse;margin-top:20px}
th,td{border-bottom:1px solid #ccc;padding:8px;text-align:left;font-size:13px}.q{text-align:center;font-weight:bold;width:60px}.box{border:1px solid #999;padding:12px;margin-top:16px;font-size:13px;line-height:1.5}
button{margin-top:20px;padding:8px 16px}@media print{button{display:none}}</style></head><body>
<h1>Packing Slip</h1><div>Order <b>${h(order.orderNumber)}</b> &middot; ${h(order.placedAt.toLocaleDateString("en-IN"))}</div>
<div class="box"><b>Ship to</b><br>${h(a.fullName)}<br>${h(a.addressLine1)}${a.addressLine2 ? "<br>" + h(a.addressLine2) : ""}<br>${h(a.city)}, ${h(a.state)} - ${h(a.postalCode)}<br>Phone: ${h(a.phone || order.user?.phone || order.guestPhone || "")}</div>
<table><thead><tr><th>Item</th><th>SKU</th><th class="q">Qty</th></tr></thead><tbody>${rows}</tbody></table>
<button onclick="window.print()">Print</button><script>window.addEventListener("load",function(){setTimeout(function(){window.print()},300)})</script>
</body></html>`;
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'",
      "Cache-Control": "no-store",
    },
  });
});
