"use client";

import React, { useState } from "react";
import { Search, Truck, Check, AlertCircle, ArrowRight, X } from "lucide-react";

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  grandTotal: number;
  createdAt: string;
  user?: { name: string; email: string } | null;
  guestEmail?: string | null;
  items: Array<{
    id: string;
    productName: string;
    variantTitle: string;
    quantity: number;
    totalPrice: number;
  }>;
  shipments: Array<{
    courierName: string;
    trackingNumber: string;
  }>;
}

export default function AdminOrderListClient({ initialOrders }: { initialOrders: Order[] }) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [trackingModalOrder, setTrackingModalOrder] = useState<Order | null>(null);
  const [courierName, setCourierName] = useState("Bluedart Express");
  const [trackingNumber, setTrackingNumber] = useState("");

  const filteredOrders = orders.filter((o) => {
    const matchesStatus = filterStatus === "ALL" || o.status === filterStatus;
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      (o.user?.email || o.guestEmail || "").toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleStatusChange = async (orderId: string, newStatus: string, trackingNum?: string, courier?: string) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch("/api/admin/orders/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          newStatus,
          trackingNumber: trackingNum,
          courierName: courier,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  status: newStatus,
                  shipments: trackingNum
                    ? [{ courierName: courier || "Express", trackingNumber: trackingNum }]
                    : o.shipments,
                }
              : o
          )
        );
        setTrackingModalOrder(null);
      } else {
        alert(data.error || "Failed to update status");
      }
    } catch {
      alert("Network error");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Status Pills */}
        <div className="flex flex-wrap gap-2 text-xs">
          {["ALL", "PENDING_PAYMENT", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"].map(
            (st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-full font-bold transition-all ${
                  filterStatus === st
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-400"
                }`}
              >
                {st}
              </button>
            )
          )}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order # or email..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 shadow-sm"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-black tracking-wider text-[10px]">
              <tr>
                <th className="p-4">Order #</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Items Summary</th>
                <th className="p-4">Total</th>
                <th className="p-4">Status</th>
                <th className="p-4">Tracking</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No orders found matching the filter.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {o.orderNumber}
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-slate-900 dark:text-white">
                        {o.user?.name || "Guest"}
                      </p>
                      <p className="text-[11px] text-slate-500">{o.user?.email || o.guestEmail}</p>
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-400">
                      {o.items.map((it) => `${it.productName} (×${it.quantity})`).join(", ")}
                    </td>
                    <td className="p-4 font-black text-slate-900 dark:text-white">
                      ₹{Math.round(o.grandTotal).toLocaleString("en-IN")}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          o.status === "CONFIRMED"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : o.status === "PROCESSING"
                            ? "bg-blue-100 text-blue-800"
                            : o.status === "SHIPPED"
                            ? "bg-purple-100 text-purple-800"
                            : o.status === "DELIVERED"
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="p-4 text-[11px]">
                      {o.shipments?.[0] ? (
                        <span className="font-mono text-indigo-600 dark:text-indigo-400">
                          {o.shipments[0].trackingNumber}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      {/* State transitions (FR-AORD-02) */}
                      {o.status === "CONFIRMED" && (
                        <button
                          onClick={() => handleStatusChange(o.id, "PROCESSING")}
                          disabled={updatingId === o.id}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[11px]"
                        >
                          Mark Processing
                        </button>
                      )}

                      {o.status === "PROCESSING" && (
                        <button
                          onClick={() => {
                            setTrackingModalOrder(o);
                            setTrackingNumber(`BLUEDART-${Math.floor(100000 + Math.random() * 900000)}`);
                          }}
                          disabled={updatingId === o.id}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-[11px] inline-flex items-center gap-1"
                        >
                          <Truck className="w-3.5 h-3.5" /> Ship Order
                        </button>
                      )}

                      {o.status === "SHIPPED" && (
                        <button
                          onClick={() => handleStatusChange(o.id, "DELIVERED")}
                          disabled={updatingId === o.id}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px]"
                        >
                          Mark Delivered
                        </button>
                      )}

                      {["CONFIRMED", "PROCESSING"].includes(o.status) && (
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to cancel order ${o.orderNumber}?`)) {
                              handleStatusChange(o.id, "CANCELLED");
                            }
                          }}
                          disabled={updatingId === o.id}
                          className="px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-[11px] font-bold"
                        >
                          Cancel
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

      {/* Tracking Modal */}
      {trackingModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Dispatch Order: {trackingModalOrder.orderNumber}
              </h3>
              <button onClick={() => setTrackingModalOrder(null)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Assign tracking details to dispatch the package. The customer will automatically receive a dispatch notification email.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Courier Partner</label>
                <input
                  type="text"
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  className="w-full mt-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Tracking AWB Number</label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="w-full mt-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTrackingModalOrder(null)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  handleStatusChange(
                    trackingModalOrder.id,
                    "SHIPPED",
                    trackingNumber,
                    courierName
                  )
                }
                disabled={!trackingNumber.trim()}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/30"
              >
                Confirm Dispatch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
