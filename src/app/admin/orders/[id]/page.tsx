import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FileText, Printer } from "lucide-react";
import { getAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { manualTransitions, parseAddress, CANCELLABLE } from "@/lib/orders";
import { StatusBadge } from "@/components/admin/orders/StatusBadge";
import OrderActions from "@/components/admin/orders/OrderActions";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { btnSecondary } from "@/components/admin/ui/tokens";

export const dynamic = "force-dynamic";

const money = (n: number) => `Rs. ${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const when = (d: Date | null) => (d ? d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "-");

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <h2 className="mb-3 text-sm font-semibold text-slate-900">{title}</h2>
      {children}
    </section>
  );
}

function AddressBlock({ a }: { a: Record<string, string> }) {
  if (!a.fullName && !a.addressLine1) return <p className="text-sm text-slate-400">Not provided</p>;
  return (
    <div className="space-y-0.5 text-sm text-slate-700">
      <p className="font-medium text-slate-900">{a.fullName}</p>
      <p>{a.addressLine1}</p>
      {a.addressLine2 && <p>{a.addressLine2}</p>}
      <p>
        {[a.city, a.state].filter(Boolean).join(", ")} {a.postalCode ? `- ${a.postalCode}` : ""}
      </p>
      {a.phone && <p>Phone: {a.phone}</p>}
    </div>
  );
}

export default async function AdminOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAdminUser("orders.view");
  if (!user) redirect(`/login?next=/admin/orders/${id}`);

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      items: true,
      payments: { include: { refunds: true }, orderBy: { createdAt: "asc" } },
      refunds: { orderBy: { createdAt: "desc" } },
      shipments: { orderBy: { createdAt: "desc" } },
      statusHistory: { orderBy: { createdAt: "desc" } },
      returnRequests: { select: { id: true, status: true } },
    },
  });
  if (!order) notFound();

  const canUpdate = can(user.role, "orders.update");
  const canRefund = can(user.role, "orders.refund");
  const ship = parseAddress(order.shippingAddressJson);
  const bill = parseAddress(order.billingAddressJson);
  const paymentOptions = order.payments
    .filter((p) => p.status === "SUCCESS")
    .map((p) => {
      const used = p.refunds.filter((r) => r.status !== "FAILED").reduce((s, r) => s + r.amount, 0);
      return { id: p.id, label: `${p.paymentMethod} ${p.pgPaymentId ?? ""}`.trim(), remaining: Math.round((p.amount - used) * 100) / 100 };
    })
    .filter((p) => p.remaining > 0);
  const pendingRefunds = order.refunds
    .filter((r) => r.status === "INITIATED")
    .map((r) => ({ id: r.id, amount: r.amount, cod: order.payments.find((p) => p.id === r.paymentId)?.paymentMethod === "COD" }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={order.orderNumber}
        badge={<StatusBadge status={order.status} />}
        description={`Placed ${when(order.placedAt)}`}
        breadcrumbs={[{ label: "Orders", href: "/admin/orders" }, { label: order.orderNumber }]}
        actions={
          <>
            <a href={`/api/admin/orders/${order.id}/packing-slip`} target="_blank" rel="noreferrer" className={btnSecondary}>
              <Printer className="h-4 w-4" /> Packing slip
            </a>
            <Link href={`/account/orders/${order.id}/invoice`} className={btnSecondary}>
              <FileText className="h-4 w-4" /> Invoice
            </Link>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Items">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="text-xs text-slate-500">
                  <tr>
                    <th className="pb-2 font-medium">Product</th>
                    <th className="pb-2 font-medium">SKU</th>
                    <th className="pb-2 text-right font-medium">Qty</th>
                    <th className="pb-2 text-right font-medium">Unit</th>
                    <th className="pb-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.items.map((i) => (
                    <tr key={i.id}>
                      <td className="py-2 font-medium">
                        {i.productName} <span className="font-normal text-slate-400">({i.variantTitle})</span>
                      </td>
                      <td className="py-2 text-slate-500">{i.sku}</td>
                      <td className="py-2 text-right">{i.quantity}</td>
                      <td className="py-2 text-right">{money(i.unitPrice)}</td>
                      <td className="py-2 text-right font-bold">{money(i.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="ml-auto mt-4 w-full max-w-xs space-y-1 text-sm">
              {[
                ["Subtotal", order.subtotal],
                ["Discount", -order.discountTotal],
                ["Tax (GST)", order.taxTotal],
                ["Shipping", order.shippingTotal],
              ].map(([k, v]) => (
                <div key={k as string} className="flex justify-between text-slate-600">
                  <dt>{k as string}</dt>
                  <dd>{money(v as number)}</dd>
                </div>
              ))}
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold text-slate-900">
                <dt>Grand total</dt>
                <dd>{money(order.grandTotal)}</dd>
              </div>
            </dl>
          </Card>

          <Card title="Payments & refunds">
            <ul className="space-y-2 text-sm">
              {order.payments.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 p-3">
                  <span>
                    <b>{p.paymentMethod === "COD" ? "Cash on delivery" : "Razorpay"}</b> {money(p.amount)}
                    {p.pgPaymentId && <span className="ml-2 text-slate-400">{p.pgPaymentId}</span>}
                  </span>
                  <StatusBadge status={p.status} />
                </li>
              ))}
              {order.refunds.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-slate-300 p-3">
                  <span>
                    Refund <b>{money(r.amount)}</b>
                    <span className="ml-2 text-slate-400">{r.refundId ?? "no gateway id"}</span>
                    {r.reason && <span className="block text-[11px] text-slate-500">{r.reason}</span>}
                  </span>
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Status timeline & notes">
            <ol className="space-y-3 border-l-2 border-slate-200 pl-4">
              {order.statusHistory.map((h) => (
                <li key={h.id} className="text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={h.status} />
                    <span className="text-slate-400">
                      {when(h.createdAt)} {h.createdBy ? `by ${h.createdBy}` : ""}
                    </span>
                  </div>
                  {h.note && (
                    <p className={`mt-1 ${h.note.startsWith("[INTERNAL NOTE]") ? "rounded-lg bg-amber-50 p-2 text-amber-800" : "text-slate-600"}`}>
                      {h.note}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Customer">
            <div className="space-y-0.5 text-sm">
              <p className="font-medium text-slate-900">{order.user?.name ?? "Guest"}</p>
              <p>{order.user?.email ?? order.guestEmail}</p>
              <p>{order.user?.phone ?? order.guestPhone ?? ""}</p>
            </div>
          </Card>
          <Card title="Shipping address">
            <AddressBlock a={ship} />
          </Card>
          <Card title="Billing address">
            <AddressBlock a={bill} />
          </Card>
          <Card title="Shipments">
            {order.shipments.length === 0 ? (
              <p className="text-sm text-slate-400">Not shipped yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {order.shipments.map((s) => (
                  <li key={s.id}>
                    <b>{s.courierName}</b> {s.trackingNumber}
                    {s.trackingUrl && (
                      <a href={s.trackingUrl} target="_blank" rel="noreferrer" className="ml-2 text-indigo-600 hover:underline">
                        Track
                      </a>
                    )}
                    <div className="text-slate-400">
                      Shipped {when(s.shippedAt)}
                      {s.estimatedDelivery ? ` | ETA ${s.estimatedDelivery.toLocaleDateString("en-IN")}` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {order.returnRequests.length > 0 && (
            <Card title="Returns">
              <ul className="space-y-1 text-sm">
                {order.returnRequests.map((r) => (
                  <li key={r.id} className="flex items-center justify-between">
                    <Link href="/admin/returns" className="text-indigo-600 hover:underline">#{r.id.slice(-6)}</Link>
                    <StatusBadge status={r.status} />
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <OrderActions
            orderId={order.id}
            status={order.status}
            transitions={canUpdate ? manualTransitions(order.status).filter((s) => s !== "CANCELLED") : []}
            canCancel={canUpdate && CANCELLABLE.includes(order.status)}
            canUpdate={canUpdate}
            canRefund={canRefund}
            hasShipment={order.shipments.length > 0}
            paymentOptions={paymentOptions}
            pendingRefunds={pendingRefunds}
          />
        </div>
      </div>
    </div>
  );
}
