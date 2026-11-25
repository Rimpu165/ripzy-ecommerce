import { handler } from "@/lib/api";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { buildOrderWhere } from "@/lib/orders";

const esc = (v: unknown) => {
  let s = String(v ?? "");
  if (/^[=+\-@]/.test(s)) s = `'${s}`; // CSV formula injection guard
  return `"${s.replace(/"/g, '""')}"`;
};

export const GET = handler({ permission: "orders.view", limit: { max: 20, windowMs: 60_000 } }, async ({ user, req }) => {
  const sp = new URL(req.url).searchParams;
  const where = buildOrderWhere({
    status: sp.get("status") || undefined,
    method: sp.get("method") || undefined,
    from: sp.get("from") || undefined,
    to: sp.get("to") || undefined,
    q: sp.get("q") || undefined,
  });
  const orders = await prisma.order.findMany({
    where,
    orderBy: { placedAt: "desc" },
    take: 5000,
    include: { user: { select: { name: true, email: true } }, payments: { select: { paymentMethod: true, status: true } }, items: { select: { quantity: true } } },
  });
  const rows = [["Order", "Placed", "Status", "Customer", "Email", "Payment", "Payment status", "Items", "Total (INR)"]];
  for (const o of orders) {
    rows.push([
      o.orderNumber,
      o.placedAt.toISOString(),
      o.status,
      o.user?.name ?? "Guest",
      o.user?.email ?? o.guestEmail ?? "",
      o.payments[0]?.paymentMethod ?? "",
      o.payments[0]?.status ?? "",
      String(o.items.reduce((s, i) => s + i.quantity, 0)),
      o.grandTotal.toFixed(2),
    ]);
  }
  await audit({ userId: user?.id, action: "EXPORT", entityType: "Order", newValues: { filters: Object.fromEntries(sp), count: orders.length }, req });
  return new Response(rows.map((r) => r.map(esc).join(",")).join("\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
});
