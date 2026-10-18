"use client";

import React, { useState } from "react";
import { Star, Check, X, Trash2, ShieldCheck, AlertCircle } from "lucide-react";

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

export default function AdminReviewsClient({
  initialReviews,
  userRole,
}: {
  initialReviews: Review[];
  userRole: string;
}) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [filter, setFilter] = useState("ALL");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filtered = reviews.filter((r) => (filter === "ALL" ? true : r.status === filter));

  const handleStatusUpdate = async (reviewId: string, status: string) => {
    setUpdatingId(reviewId);
    try {
      const res = await fetch("/api/admin/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, status }),
      });
      if (res.ok) {
        setReviews((prev) =>
          prev.map((r) => (r.id === reviewId ? { ...r, status } : r))
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!confirm("Are you sure you want to permanently delete this review?")) return;
    try {
      const res = await fetch("/api/admin/reviews", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId }),
      });
      if (res.ok) {
        setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex gap-2 text-xs">
        {["ALL", "APPROVED", "PENDING", "REJECTED"].map((st) => (
          <button
            key={st}
            onClick={() => setFilter(st)}
            className={`px-3 py-1.5 rounded-full font-bold transition-all ${
              filter === st
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Review List Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-black tracking-wider text-[10px]">
              <tr>
                <th className="p-4">Product</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Rating & Review</th>
                <th className="p-4">Verified</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No reviews in this moderation queue.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-4 font-bold text-slate-900 dark:text-white max-w-[180px] truncate">
                      {r.product?.name || "Product"}
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-slate-800 dark:text-slate-200">{r.user?.name || "Customer"}</p>
                      <p className="text-[10px] text-slate-400">{r.user?.email}</p>
                    </td>
                    <td className="p-4 max-w-sm">
                      <div className="flex items-center text-amber-400 mb-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < r.rating ? "fill-amber-400" : "text-slate-300 dark:text-slate-700"
                            }`}
                          />
                        ))}
                      </div>
                      {r.title && <p className="font-bold text-slate-900 dark:text-white">{r.title}</p>}
                      <p className="text-slate-600 dark:text-slate-300 line-clamp-2">{r.comment}</p>
                    </td>
                    <td className="p-4">
                      {r.isVerifiedBuyer ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                          <ShieldCheck className="w-3 h-3" /> Verified Buyer
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">Standard</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          r.status === "APPROVED"
                            ? "bg-emerald-100 text-emerald-800"
                            : r.status === "REJECTED"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                      {r.status !== "APPROVED" && (
                        <button
                          onClick={() => handleStatusUpdate(r.id, "APPROVED")}
                          disabled={updatingId === r.id}
                          className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg font-bold text-[11px]"
                          title="Approve Review"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      {r.status !== "REJECTED" && (
                        <button
                          onClick={() => handleStatusUpdate(r.id, "REJECTED")}
                          disabled={updatingId === r.id}
                          className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-lg font-bold text-[11px]"
                          title="Reject Review"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      {["MANAGER", "SUPER_ADMIN"].includes(userRole) && (
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg font-bold text-[11px]"
                          title="Delete Review"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
