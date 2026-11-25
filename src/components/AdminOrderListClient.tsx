"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, ShoppingBag } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { DataTable } from "@/components/admin/ui/DataTable";
import { FilterBar, FilterInput, FilterSelect, SearchInput } from "@/components/admin/ui/FilterBar";
import { Pagination } from "@/components/admin/ui/Pagination";
import { EmptyState } from "@/components/admin/ui/EmptyState";
import { btnPrimary, btnSecondary, thCls, tdCls } from "@/components/admin/ui/tokens";

export interface OrderRow {
  id: string;
  orderNumber: string;
  status: string;
  grandTotal: number;
  placedAt: string;
  customer: string;
  email: string;
  itemCount: number;
  method: string;
  paymentStatus: string;
  tracking: string;
}
interface Filters {
  status: string;
  method: string;
  from: string;
  to: string;
  q: string;
}

const STATUSES = ["PENDING_PAYMENT", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];
const STATUS_OPTIONS = STATUSES.map((s) => ({ value: s, label: s.charAt(0) + s.slice(1).toLowerCase().replace("_", " ") }));

const methodLabel = (m: string) => (m === "COD" ? "COD" : m === "RAZORPAY" ? "Prepaid" : m);
const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

export default function AdminOrderListClient({
  orders,
  filters,
  page,
  pages,
  total,
  canUpdate,
}: {
  orders: OrderRow[];
  filters: Filters;
  page: number;
  pages: number;
  total: number;
  canUpdate: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const qs = (over: Partial<Filters> & { page?: number }) => {
    const p = new URLSearchParams();
    const merged = { ...filters, ...over };
    (["status", "method", "from", "to", "q"] as const).forEach((k) => merged[k] && p.set(k, merged[k]));
    if (over.page && over.page > 1) p.set("page", String(over.page));
    return p.toString();
  };

  const apply = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) || "");
    setSelected([]);
    router.push(`/admin/orders?${qs({ status: get("status"), method: get("method"), from: get("from"), to: get("to"), q: get("q") })}`);
  };

  const confirmedIds = orders.filter((o) => o.status === "CONFIRMED").map((o) => o.id);
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const hasFilters = !!(filters.status || filters.method || filters.from || filters.to || filters.q);

  const bulkProcess = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/orders/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds: selected, action: "PROCESSING" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bulk update failed");
      if (data.failed?.length) toast.error(`${data.updated} updated, ${data.failed.length} failed`);
      else toast.success(`${data.updated} order(s) marked as processing`);
      setSelected([]);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bulk update failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <FilterBar
        onSubmit={apply}
        formKey={JSON.stringify(filters)}
        clearHref={hasFilters ? "/admin/orders" : undefined}
        extra={
          <a href={`/api/admin/orders/export?${qs({})}`} className={btnSecondary}>
            <Download className="h-4 w-4" /> Export CSV
          </a>
        }
      >
        <SearchInput defaultValue={filters.q} placeholder="Order #, name, email, phone" label="Search orders" />
        <FilterSelect label="Status" name="status" defaultValue={filters.status} options={STATUS_OPTIONS} />
        <FilterSelect
          label="Payment"
          name="method"
          defaultValue={filters.method}
          options={[
            { value: "RAZORPAY", label: "Prepaid" },
            { value: "COD", label: "COD" },
          ]}
        />
        <FilterInput label="From" name="from" type="date" defaultValue={filters.from} />
        <FilterInput label="To" name="to" type="date" defaultValue={filters.to} />
      </FilterBar>

      {canUpdate && (
        <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
          <button
            onClick={() => setSelected(selected.length === confirmedIds.length ? [] : confirmedIds)}
            disabled={!confirmedIds.length}
            className="rounded font-medium text-indigo-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 disabled:opacity-40"
          >
            {selected.length && selected.length === confirmedIds.length ? "Clear selection" : `Select all confirmed on page (${confirmedIds.length})`}
          </button>
          <button onClick={bulkProcess} disabled={!selected.length || busy} className={`${btnPrimary} !py-1.5`}>
            {busy ? "Updating..." : `Mark as processing (${selected.length})`}
          </button>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={ShoppingBag}
            title="No orders found"
            description={hasFilters ? "No orders match these filters. Try widening the date range or clearing filters." : "Orders will appear here once customers check out."}
            action={hasFilters ? <Link href="/admin/orders" className={btnSecondary}>Clear filters</Link> : undefined}
          />
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <ul className="space-y-3 md:hidden">
            {orders.map((o) => (
              <li key={o.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {canUpdate && o.status === "CONFIRMED" && (
                      <input
                        type="checkbox"
                        aria-label={`Select ${o.orderNumber}`}
                        checked={selected.includes(o.id)}
                        onChange={() => toggle(o.id)}
                        className="mt-1 h-4 w-4 rounded border-slate-300"
                      />
                    )}
                    <div>
                      <Link href={`/admin/orders/${o.id}`} className="font-medium text-indigo-600 hover:underline">
                        {o.orderNumber}
                      </Link>
                      <p className="text-xs text-slate-500">{when(o.placedAt)}</p>
                    </div>
                  </div>
                  <StatusBadge status={o.status} />
                </div>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{o.customer}</p>
                    <p className="truncate text-xs text-slate-500">
                      {o.itemCount} item(s) · {methodLabel(o.method)} · {o.paymentStatus}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">Rs. {o.grandTotal.toLocaleString("en-IN")}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden md:block">
            <DataTable minWidth={880} label="Orders">
              <thead>
                <tr>
                  <th className={`${thCls} w-10`}>
                    <span className="sr-only">Select</span>
                  </th>
                  <th className={thCls}>Order</th>
                  <th className={thCls}>Customer</th>
                  <th className={thCls}>Placed</th>
                  <th className={thCls}>Payment</th>
                  <th className={`${thCls} text-right`}>Total</th>
                  <th className={thCls}>Status</th>
                  <th className={thCls}>Tracking</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className={tdCls}>
                      {o.status === "CONFIRMED" && canUpdate && (
                        <input
                          type="checkbox"
                          aria-label={`Select ${o.orderNumber}`}
                          checked={selected.includes(o.id)}
                          onChange={() => toggle(o.id)}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                      )}
                    </td>
                    <td className={tdCls}>
                      <Link href={`/admin/orders/${o.id}`} className="font-medium text-indigo-600 hover:underline">
                        {o.orderNumber}
                      </Link>
                      <div className="text-xs text-slate-500">{o.itemCount} item(s)</div>
                    </td>
                    <td className={tdCls}>
                      <div className="font-medium text-slate-800">{o.customer}</div>
                      <div className="text-xs text-slate-500">{o.email}</div>
                    </td>
                    <td className={`${tdCls} whitespace-nowrap`}>{when(o.placedAt)}</td>
                    <td className={tdCls}>
                      <div>{methodLabel(o.method)}</div>
                      <div className="text-xs text-slate-500">{o.paymentStatus}</div>
                    </td>
                    <td className={`${tdCls} text-right font-medium tabular-nums text-slate-900`}>Rs. {o.grandTotal.toLocaleString("en-IN")}</td>
                    <td className={tdCls}>
                      <StatusBadge status={o.status} />
                    </td>
                    <td className={`${tdCls} text-slate-500`}>{o.tracking || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </div>
        </>
      )}

      <Pagination page={page} pages={pages} total={total} pageSize={20} hrefFor={(p) => `/admin/orders?${qs({ page: p })}`} />
    </div>
  );
}
