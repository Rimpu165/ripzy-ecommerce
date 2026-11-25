import React from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Package, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import ReorderButton from "@/components/account/ReorderButton";
import StatusChip from "@/components/account/StatusChip";
import { cardCls, inr } from "@/components/account/styles";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Orders | Ripzy" };

const PAGE_SIZE = 10;
const FILTERS = [
  { key: "", label: "All" },
  { key: "PENDING_PAYMENT", label: "Pending payment" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "PROCESSING", label: "Processing" },
  { key: "SHIPPED", label: "Shipped" },
  { key: "DELIVERED", label: "Delivered" },
  { key: "CANCELLED", label: "Cancelled" },
];

interface Props {
  searchParams: Promise<{ status?: string; page?: string }>;
}

export default async function AccountOrdersPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account/orders");

  const sp = await searchParams;
  const status = FILTERS.some((f) => f.key && f.key === sp.status) ? sp.status! : "";
  const requestedPage = Math.max(1, parseInt(sp.page || "1", 10) || 1);

  const where = { userId: user.id, ...(status ? { status } : {}) };
  const total = await prisma.order.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);

  const orders = await prisma.order.findMany({
    where,
    include: { items: true },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const href = (p: number, s = status) => {
    const q = new URLSearchParams();
    if (s) q.set("status", s);
    if (p > 1) q.set("page", String(p));
    const qs = q.toString();
    return `/account/orders${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Orders</h1>
        <p className="mt-1 text-sm text-slate-500">Track orders, view invoices, return or reorder.</p>
      </div>

      <nav
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 [scrollbar-width:none]"
        aria-label="Filter orders by status"
      >
        {FILTERS.map((f) => {
          const active = status === f.key;
          return (
            <Link
              key={f.key || "all"}
              href={href(1, f.key)}
              aria-current={active ? "true" : undefined}
              className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </nav>

      {orders.length === 0 ? (
        <div className={`${cardCls} p-10 text-center sm:p-14`}>
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <Package className="h-7 w-7" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-base font-semibold text-slate-900">
            {status ? "No orders with this status" : "No orders yet"}
          </h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            {status ? "Try a different filter." : "When you place an order, you can track it here."}
          </p>
          <Link href={status ? "/account/orders" : "/products"} className="btn-primary mt-5">
            {status ? "Show all orders" : "Start shopping"}
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            let shippingAddr: { fullName?: string } = {};
            try {
              shippingAddr = JSON.parse(order.shippingAddressJson);
            } catch {
              /* ignore */
            }
            const reorderItems = order.items
              .filter((i) => i.variantId)
              .map((i) => ({ variantId: i.variantId as string, quantity: i.quantity }));

            return (
              <article key={order.id} className={`${cardCls} overflow-hidden transition hover:shadow-card`}>
                <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-slate-100 bg-slate-50/70 px-5 py-4 text-sm">
                  <div className="flex flex-wrap gap-x-8 gap-y-2">
                    <div>
                      <p className="text-xs text-slate-500">Placed</p>
                      <p className="font-medium text-slate-900">
                        {order.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Total</p>
                      <p className="font-medium text-slate-900">{inr(order.grandTotal)}</p>
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-xs text-slate-500">Ship to</p>
                      <p className="max-w-[150px] truncate font-medium text-slate-900">{shippingAddr.fullName || user.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-semibold text-slate-600">{order.orderNumber}</span>
                    <StatusChip status={order.status} />
                  </div>
                </div>

                <ul className="space-y-3 p-5">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-4 text-sm">
                      <div className="flex min-w-0 items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.image || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=120&q=80"}
                          alt={item.productName}
                          className="h-14 w-14 shrink-0 rounded-xl bg-slate-100 object-cover"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900">{item.productName}</p>
                          <p className="text-xs text-slate-500">
                            {item.variantTitle} · Qty {item.quantity}
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 font-medium text-slate-900">{inr(item.totalPrice)}</span>
                    </li>
                  ))}
                </ul>

                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
                  <ReorderButton items={reorderItems} />
                  <Link
                    href={`/account/orders/${order.id}/invoice`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <FileText className="h-3.5 w-3.5" aria-hidden="true" /> Invoice
                  </Link>
                  <Link
                    href={`/account/orders/${order.id}`}
                    className="inline-flex items-center rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                  >
                    View details
                  </Link>
                </div>
              </article>
            );
          })}

          {totalPages > 1 && (
            <nav aria-label="Pagination" className="flex items-center justify-between pt-2">
              {page > 1 ? (
                <Link href={href(page - 1)} className="flex items-center gap-1 text-sm font-medium text-indigo-600">
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous
                </Link>
              ) : (
                <span />
              )}
              <span className="text-xs text-slate-500">
                Page {page} of {totalPages}
              </span>
              {page < totalPages ? (
                <Link href={href(page + 1)} className="flex items-center gap-1 text-sm font-medium text-indigo-600">
                  Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </div>
      )}
    </div>
  );
}
