"use client";

import React, { useState } from "react";
import { Star, Check, X, Trash2, ShieldCheck, MessageSquare, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { DataTable } from "@/components/admin/ui/DataTable";
import { EmptyCard } from "@/components/admin/ui/EmptyState";
import { ConfirmDialog } from "@/components/admin/ui/Modal";
import { thCls, tdCls } from "@/components/admin/ui/tokens";

interface Review {
  id: string;
  rating: number;
  title: string | null;
  comment: string;
  isVerifiedBuyer: boolean;
  status: string;
  createdAt: string;
  user?: { name: string; email: string } | null;
  product?: { name: string; slug: string } | null;
}

const PAGE_SIZE = 20;
const iconBtn =
  "rounded-lg p-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 disabled:opacity-50";

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center" role="img" aria-label={`${rating} out of 5 stars`}>
      {[...Array(5)].map((_, i) => (
        <Star key={i} className={`h-3.5 w-3.5 ${i < rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
      ))}
    </div>
  );
}

export default function AdminReviewsClient({ initialReviews }: { initialReviews: Review[] }) {
  const toast = useToast();
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [filter, setFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Review | null>(null);

  const filtered = reviews.filter((r) => (filter === "ALL" ? true : r.status === filter));
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const cur = Math.min(page, pages);
  const visible = filtered.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);

  async function send(method: "PATCH" | "DELETE", body: Record<string, string>) {
    const res = await fetch("/api/admin/reviews", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Request failed");
  }

  async function setStatus(reviewId: string, status: string) {
    setBusyId(reviewId);
    try {
      await send("PATCH", { reviewId, status });
      setReviews((prev) => prev.map((r) => (r.id === reviewId ? { ...r, status } : r)));
      toast.success(`Review ${status.toLowerCase()}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(reviewId: string) {
    setBusyId(reviewId);
    try {
      await send("DELETE", { reviewId });
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      toast.success("Review deleted.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusyId(null);
      setToDelete(null);
    }
  }

  const Actions = ({ r }: { r: Review }) => (
    <div className="flex items-center gap-1.5">
      {r.status !== "APPROVED" && (
        <button onClick={() => setStatus(r.id, "APPROVED")} disabled={busyId === r.id} aria-label="Approve review" title="Approve" className={`${iconBtn} bg-emerald-50 text-emerald-600 hover:bg-emerald-100`}>
          <Check className="h-4 w-4" />
        </button>
      )}
      {r.status !== "REJECTED" && (
        <button onClick={() => setStatus(r.id, "REJECTED")} disabled={busyId === r.id} aria-label="Reject review" title="Reject" className={`${iconBtn} bg-amber-50 text-amber-600 hover:bg-amber-100`}>
          <X className="h-4 w-4" />
        </button>
      )}
      <button onClick={() => setToDelete(r)} disabled={busyId === r.id} aria-label="Delete review" title="Delete" className={`${iconBtn} bg-rose-50 text-rose-600 hover:bg-rose-100`}>
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );

  const Verified = ({ r }: { r: Review }) =>
    r.isVerifiedBuyer ? (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
        <ShieldCheck className="h-3.5 w-3.5" /> Verified buyer
      </span>
    ) : (
      <span className="text-xs text-slate-400">Standard</span>
    );

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1 text-sm" role="tablist" aria-label="Filter by status">
        {["ALL", "PENDING", "APPROVED", "REJECTED"].map((st) => (
          <button
            key={st}
            role="tab"
            aria-selected={filter === st}
            onClick={() => {
              setFilter(st);
              setPage(1);
            }}
            className={`shrink-0 rounded-full px-3 py-1.5 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 ${
              filter === st ? "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {st === "ALL" ? "All" : st.charAt(0) + st.slice(1).toLowerCase()}
            {st !== "ALL" && ` (${reviews.filter((r) => r.status === st).length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyCard icon={MessageSquare} title="No reviews in this queue" description="New customer reviews will appear here for moderation." />
      ) : (
        <>
          {/* Mobile cards */}
          <ul className="space-y-3 md:hidden">
            {visible.map((r) => (
              <li key={r.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 truncate text-sm font-medium text-slate-900">{r.product?.name || "Product"}</p>
                  <StatusBadge status={r.status} />
                </div>
                <div className="mt-1">
                  <Stars rating={r.rating} />
                </div>
                {r.title && <p className="mt-2 text-sm font-medium text-slate-900">{r.title}</p>}
                <p className="mt-1 line-clamp-3 text-sm text-slate-600">{r.comment}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {r.user?.name || "Customer"} · <Verified r={r} />
                </p>
                <div className="mt-3 flex justify-end">
                  <Actions r={r} />
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden md:block">
            <DataTable minWidth={760} label="Reviews">
              <thead>
                <tr>
                  <th className={thCls}>Product</th>
                  <th className={thCls}>Customer</th>
                  <th className={thCls}>Rating &amp; review</th>
                  <th className={thCls}>Status</th>
                  <th className={`${thCls} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className={`${tdCls} max-w-[180px] truncate font-medium text-slate-900`}>{r.product?.name || "Product"}</td>
                    <td className={tdCls}>
                      <p className="font-medium text-slate-800">{r.user?.name || "Customer"}</p>
                      <p className="text-xs text-slate-500">{r.user?.email}</p>
                      <div className="mt-1">
                        <Verified r={r} />
                      </div>
                    </td>
                    <td className={`${tdCls} max-w-sm`}>
                      <div className="mb-1">
                        <Stars rating={r.rating} />
                      </div>
                      {r.title && <p className="font-medium text-slate-900">{r.title}</p>}
                      <p className="line-clamp-2 text-slate-600">{r.comment}</p>
                    </td>
                    <td className={tdCls}>
                      <StatusBadge status={r.status} />
                    </td>
                    <td className={`${tdCls} whitespace-nowrap`}>
                      <div className="flex justify-end">
                        <Actions r={r} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </div>

          <nav aria-label="Pagination" className="flex flex-col items-center justify-between gap-3 text-sm text-slate-500 sm:flex-row">
            <span>
              {filtered.length} review{filtered.length === 1 ? "" : "s"} · Page {cur} of {pages}
            </span>
            <div className="flex gap-2">
              <button disabled={cur <= 1} onClick={() => setPage(cur - 1)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <button disabled={cur >= pages} onClick={() => setPage(cur + 1)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </nav>
        </>
      )}

      <ConfirmDialog
        open={!!toDelete}
        danger
        title="Delete this review?"
        message="The review will be permanently removed. This cannot be undone."
        confirmLabel="Delete"
        busy={!!toDelete && busyId === toDelete.id}
        onCancel={() => setToDelete(null)}
        onConfirm={() => toDelete && remove(toDelete.id)}
      />
    </div>
  );
}
