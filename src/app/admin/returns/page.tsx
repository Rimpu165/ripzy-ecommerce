import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import AdminReturnsClient, { type ReturnRow } from "@/components/admin/orders/AdminReturnsClient";

export const dynamic = "force-dynamic";

const TABS = ["REQUESTED", "APPROVED", "RECEIVED", "REFUNDED", "REJECTED"];

export default async function AdminReturnsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await getAdminUser("returns.manage");
  if (!user) redirect("/login?next=/admin/returns");
  const { status } = await searchParams;
  const active = status && TABS.includes(status) ? status : "REQUESTED";

  const [rows, counts] = await Promise.all([
    prisma.returnRequest.findMany({
      where: { status: active },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: { select: { name: true, email: true } },
        order: { select: { id: true, orderNumber: true, grandTotal: true, guestEmail: true, items: { select: { productName: true, variantTitle: true, quantity: true } } } },
      },
    }),
    prisma.returnRequest.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const count = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;

  const data: ReturnRow[] = rows.map((r) => ({
    id: r.id,
    status: r.status,
    reason: r.reason,
    details: r.details,
    adminNote: r.adminNote,
    refundAmount: r.refundAmount,
    createdAt: r.createdAt.toISOString(),
    customer: r.user?.name ?? "Guest",
    email: r.user?.email ?? r.order.guestEmail ?? "",
    orderId: r.order.id,
    orderNumber: r.order.orderNumber,
    orderTotal: r.order.grandTotal,
    items: r.order.items,
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Returns & Refunds" description="Approve or reject requests, receive items, and refund customers." />
      <nav className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 text-sm" aria-label="Return status">
        {TABS.map((t) => (
          <Link
            key={t}
            href={`/admin/returns?status=${t}`}
            aria-current={t === active ? "page" : undefined}
            className={`shrink-0 rounded-full px-3 py-1.5 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 ${
              t === active ? "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t.charAt(0) + t.slice(1).toLowerCase()} ({count(t)})
          </Link>
        ))}
      </nav>
      <AdminReturnsClient rows={data} canRefund={can(user.role, "orders.refund")} />
    </div>
  );
}
