import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, FileText, Truck, ExternalLink, MapPin, CreditCard } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getNumberSetting } from "@/lib/settings";
import OrderActions from "@/components/account/OrderActions";
import ReorderButton from "@/components/account/ReorderButton";
import OrderTimeline from "@/components/account/OrderTimeline";
import StatusChip from "@/components/account/StatusChip";
import { cardCls, inr } from "@/components/account/styles";

export const dynamic = "force-dynamic";
export const metadata = { title: "Order Details | Ripzy" };

interface Props {
  params: Promise<{ id: string }>;
}

const isFuture = (d: Date) => d.getTime() > Date.now();
const fmt = (d: Date) =>
  d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/account/orders/${id}`);

  // Ownership is part of the query: other customers' orders simply 404.
  const order = await prisma.order.findFirst({
    where: { id, userId: user.id },
    include: {
      items: true,
      payments: { orderBy: { createdAt: "desc" } },
      shipments: { orderBy: { createdAt: "desc" } },
      statusHistory: { orderBy: { createdAt: "asc" } },
      refunds: true,
      returnRequests: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!order) notFound();

  const returnWindowDays = await getNumberSetting("order.returnWindowDays");
  const returnDeadline = order.deliveredAt ? new Date(order.deliveredAt.getTime() + returnWindowDays * 86400000) : null;
  const canCancel = ["PENDING_PAYMENT", "CONFIRMED", "PROCESSING"].includes(order.status);
  const activeReturn = order.returnRequests.find((r) => r.status !== "REJECTED");
  const canReturn = order.status === "DELIVERED" && !!returnDeadline && isFuture(returnDeadline) && !activeReturn;

  let addr: Record<string, string> = {};
  try {
    addr = JSON.parse(order.shippingAddressJson);
  } catch {
    /* ignore */
  }
  const payment = order.payments[0];
  const reorderItems = order.items
    .filter((i) => i.variantId)
    .map((i) => ({ variantId: i.variantId as string, quantity: i.quantity }));

  const effectiveStatus = order.status;

  return (
    <div className="space-y-6">
      <Link href="/account/orders" className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline">
        <ChevronLeft className="h-4 w-4" aria-hidden="true" /> All orders
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-xl font-semibold text-slate-900 sm:text-2xl">{order.orderNumber}</h1>
            <StatusChip status={effectiveStatus} />
          </div>
          <p className="mt-1 text-sm text-slate-500">Placed on {fmt(order.placedAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/account/orders/${order.id}/invoice`}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <FileText className="h-4 w-4" aria-hidden="true" /> Invoice
          </Link>
          <ReorderButton items={reorderItems} />
          <OrderActions
            orderId={order.id}
            orderNumber={order.orderNumber}
            canCancel={canCancel}
            canReturn={canReturn}
            returnDeadline={canReturn && returnDeadline ? returnDeadline.toISOString() : null}
          />
        </div>
      </div>

      <section className={`${cardCls} p-5 sm:p-6`} aria-label="Order progress">
        <OrderTimeline
          status={effectiveStatus}
          placedAt={order.placedAt.toISOString()}
          history={order.statusHistory.map((h) => ({ status: h.status, note: h.note, at: h.createdAt.toISOString() }))}
        />
      </section>

      {activeReturn && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800" role="status">
          Return request <strong>{activeReturn.status}</strong> - submitted {fmt(activeReturn.createdAt)}. Reason: {activeReturn.reason}
          {activeReturn.adminNote ? ` - Note from us: ${activeReturn.adminNote}` : ""}
        </div>
      )}
      {order.status === "DELIVERED" && !canReturn && !activeReturn && returnDeadline && (
        <p className="text-sm text-slate-500">The {returnWindowDays}-day return window closed on {fmt(returnDeadline)}.</p>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <section className={`${cardCls} p-5 sm:p-6`}>
            <h2 className="mb-2 font-semibold text-slate-900">Items ({order.items.length})</h2>
            <ul className="divide-y divide-slate-100">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <div className="flex min-w-0 items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.image || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=120&q=80"}
                      alt={item.productName}
                      className="h-16 w-16 shrink-0 rounded-xl bg-slate-100 object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">{item.productName}</p>
                      <p className="text-xs text-slate-500">
                        {item.variantTitle} · SKU {item.sku}
                      </p>
                      <p className="text-xs text-slate-500">
                        {inr(item.unitPrice)} × {item.quantity}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 font-medium text-slate-900">{inr(item.totalPrice)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className={`${cardCls} p-5 sm:p-6`}>
            <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
              <Truck className="h-4 w-4 text-indigo-600" aria-hidden="true" /> Tracking
            </h2>
            {order.shipments.length === 0 ? (
              <p className="text-sm text-slate-500">Not shipped yet. Tracking details will appear here once your order is dispatched.</p>
            ) : (
              <div className="space-y-4">
                {order.shipments.map((s) => (
                  <div key={s.id} className="space-y-1.5 rounded-xl bg-slate-50 p-4 text-sm">
                    <Row label="Courier" value={s.courierName} />
                    <Row label="Tracking number" value={s.trackingNumber} />
                    {s.estimatedDelivery && <Row label="Estimated delivery" value={fmt(s.estimatedDelivery)} />}
                    {s.trackingUrl && /^https?:\/\//.test(s.trackingUrl) && (
                      <a
                        href={s.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 pt-1 text-sm font-medium text-indigo-600 hover:underline"
                      >
                        Track package <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className={`${cardCls} space-y-2 p-5 text-sm sm:p-6`}>
            <h2 className="mb-2 font-semibold text-slate-900">Price breakdown</h2>
            <Row label="Subtotal" value={inr(order.subtotal)} />
            {order.discountTotal > 0 && (
              <Row label={`Discount${order.couponCode ? ` (${order.couponCode})` : ""}`} value={`- ${inr(order.discountTotal)}`} className="text-emerald-600" />
            )}
            <Row label="GST" value={inr(order.taxTotal)} />
            <Row label="Shipping" value={order.shippingTotal === 0 ? "Free" : inr(order.shippingTotal)} />
            <div className="mt-2 border-t border-slate-100 pt-3">
              <Row label="Total" value={inr(order.grandTotal)} className="text-base !font-semibold text-slate-900" />
            </div>
          </section>

          <section className={`${cardCls} space-y-1 p-5 text-sm sm:p-6`}>
            <h2 className="mb-2 flex items-center gap-2 font-semibold text-slate-900">
              <MapPin className="h-4 w-4 text-indigo-600" aria-hidden="true" /> Shipping address
            </h2>
            <p className="font-medium text-slate-900">{addr.fullName}</p>
            <p className="text-slate-600">
              {addr.addressLine1}
              {addr.addressLine2 ? `, ${addr.addressLine2}` : ""}
              <br />
              {addr.city}, {addr.state} - {addr.postalCode}
              {addr.phone && (
                <>
                  <br />
                  Phone: {addr.phone}
                </>
              )}
            </p>
          </section>

          <section className={`${cardCls} space-y-2 p-5 text-sm sm:p-6`}>
            <h2 className="mb-2 flex items-center gap-2 font-semibold text-slate-900">
              <CreditCard className="h-4 w-4 text-indigo-600" aria-hidden="true" /> Payment
            </h2>
            {payment ? (
              <>
                <Row label="Method" value={payment.paymentMethod === "COD" ? "Cash on delivery" : "Online (Razorpay)"} />
                <Row label="Status" value={payment.status} />
              </>
            ) : (
              <p className="text-slate-500">No payment record.</p>
            )}
            {order.refunds.map((r) => (
              <Row key={r.id} label="Refund" value={`${inr(r.amount)} - ${r.status}`} className="text-amber-600" />
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`flex justify-between gap-4 text-slate-600 ${className}`}>
      <span>{label}</span>
      <span className="break-all text-right font-medium">{value}</span>
    </div>
  );
}
