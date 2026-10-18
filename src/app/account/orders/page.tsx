import React from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Package, Clock, CheckCircle2, ChevronRight, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AccountOrdersPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/account/orders");
  }

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    include: {
      items: true,
      payments: true,
      shipments: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white">Order History</h1>
        <p className="text-xs text-slate-500 mt-1">
          Review your past orders, delivery tracking, and invoice receipts
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 border border-slate-200 dark:border-slate-800 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <Package className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No Orders Placed Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You haven't placed any orders with Ripzy yet. Discover our latest collections!
          </p>
          <Link
            href="/products"
            className="inline-block px-5 py-2.5 rounded-full bg-indigo-600 text-white font-bold text-xs shadow-md shadow-indigo-600/20"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => {
            let shippingAddr: any = {};
            try {
              shippingAddr = JSON.parse(order.shippingAddressJson);
            } catch {}

            return (
              <div
                key={order.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Header info */}
                <div className="p-5 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div className="flex flex-wrap gap-6 items-center">
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-bold">Order Placed</span>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {new Date(order.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-bold">Total Amount</span>
                      <p className="font-bold text-slate-900 dark:text-white">
                        ₹{Math.round(order.grandTotal).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-bold">Ship To</span>
                      <p className="font-semibold text-slate-900 dark:text-white truncate max-w-[150px]">
                        {shippingAddr.fullName || user.name}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                      {order.orderNumber}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        order.status === "CONFIRMED"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : order.status === "DELIVERED"
                          ? "bg-indigo-100 text-indigo-700"
                          : order.status === "PENDING_PAYMENT"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>

                {/* Items */}
                <div className="p-5 space-y-4">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-4 text-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={item.image || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=120&q=80"}
                          alt={item.productName}
                          className="w-14 h-14 object-cover rounded-xl bg-slate-100 flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 dark:text-white truncate">
                            {item.productName}
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            {item.variantTitle} • Qty: {item.quantity}
                          </p>
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            ₹{item.unitPrice.toLocaleString("en-IN")} each
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          ₹{Math.round(item.totalPrice).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tracking / Footer notes */}
                <div className="px-5 py-3 bg-slate-50/40 dark:bg-slate-800/20 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    Estimated Dispatch within 24 Hours
                  </span>
                  <span className="text-[11px]">GST 18% inclusive</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
