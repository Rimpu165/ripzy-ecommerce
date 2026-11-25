import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { buildOrderWhere } from "@/lib/orders";
import AdminOrderListClient from "@/components/AdminOrderListClient";
import { PageHeader } from "@/components/admin/ui/PageHeader";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || "";

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await getAdminUser("orders.view");
  if (!user) redirect("/login?next=/admin/orders");

  const sp = await searchParams;
  const filters = { status: one(sp.status), method: one(sp.method), from: one(sp.from), to: one(sp.to), q: one(sp.q) };
  const where = buildOrderWhere(filters);
  const total = await prisma.order.count({ where });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, parseInt(one(sp.page)) || 1), pages);

  const orders = await prisma.order.findMany({
    where,
    orderBy: { placedAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      orderNumber: true,
      status: true,
      grandTotal: true,
      placedAt: true,
      guestEmail: true,
      user: { select: { name: true, email: true } },
      items: { select: { quantity: true } },
      payments: { select: { paymentMethod: true, status: true } },
      shipments: { select: { courierName: true, trackingNumber: true } },
    },
  });

  const rows = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    grandTotal: o.grandTotal,
    placedAt: o.placedAt.toISOString(),
    customer: o.user?.name ?? "Guest",
    email: o.user?.email ?? o.guestEmail ?? "",
    itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
    method: o.payments[0]?.paymentMethod ?? "-",
    paymentStatus: o.payments[0]?.status ?? "-",
    tracking: o.shipments[0] ? `${o.shipments[0].courierName} ${o.shipments[0].trackingNumber}` : "",
  }));

  return (
    <div>
      <PageHeader
        title="Orders"
        description={`${total} order${total === 1 ? "" : "s"} match. Review, filter and move orders through fulfilment.`}
      />
      <AdminOrderListClient orders={rows} filters={filters} page={page} pages={pages} total={total} canUpdate={can(user.role, "orders.update")} />
    </div>
  );
}
