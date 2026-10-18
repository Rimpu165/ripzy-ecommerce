import React from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import {
  TrendingUp,
  ShoppingBag,
  Users,
  DollarSign,
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
  Package,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();

  // FR-ADM-01: Only Staff, Manager, Super Admin can access /admin
  if (!user || !["STAFF", "MANAGER", "SUPER_ADMIN"].includes(user.role)) {
    redirect("/login?next=/admin");
  }

  // 1. KPI Aggregations (FR-DASH-01)
  const [totalOrders, allOrders, totalCustomers, lowStockVariants, recentOrders] =
    await Promise.all([
      prisma.order.count(),
      prisma.order.findMany({ select: { grandTotal: true, status: true } }),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.productVariant.findMany({
        where: { stock: { lte: 5 } },
        include: { product: true },
        take: 5,
      }),
      prisma.order.findMany({
        include: { user: { select: { name: true, email: true } }, items: true },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
    ]);

  const totalRevenue = allOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Status distribution (FR-DASH-02)
  const ordersByStatus = allOrders.reduce((acc: Record<string, number>, curr) => {
    acc[curr.status] = (acc[curr.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20">
      {/* Admin Top Navigation Bar */}
      <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-rose-500 flex items-center justify-center font-black text-sm">
            R
          </span>
          <span className="font-extrabold text-lg">Ripzy Admin</span>
          <span className="text-[10px] uppercase font-black tracking-wider bg-indigo-500/30 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-500/40">
            {user.role}
          </span>
        </div>

        <div className="flex items-center gap-5 text-xs font-semibold">
          <Link href="/admin/orders" className="text-slate-300 hover:text-white transition-colors">
            Orders
          </Link>
          <Link href="/admin/products" className="text-slate-300 hover:text-white transition-colors">
            Products & Stock
          </Link>
          <Link href="/admin/reviews" className="text-slate-300 hover:text-white transition-colors">
            Reviews
          </Link>
          {["MANAGER", "SUPER_ADMIN"].includes(user.role) && (
            <Link href="/admin/reports" className="text-slate-300 hover:text-white transition-colors">
              Reports (CSV)
            </Link>
          )}
          <Link href="/" className="text-indigo-400 hover:underline flex items-center gap-1">
            Store <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            Operations & Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time sales, order fulfillment pipeline, and inventory status
          </p>
        </div>

        {/* 1. KPI Cards (FR-DASH-01) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider">Total Revenue</span>
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 rounded-xl">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              ₹{Math.round(totalRevenue).toLocaleString("en-IN")}
            </div>
            <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Live Gross Volume
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider">Total Orders</span>
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 rounded-xl">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {totalOrders}
            </div>
            <span className="text-[11px] text-indigo-600 font-bold">
              All Channels & COD
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider">Average Order Value</span>
              <div className="p-2 bg-violet-50 dark:bg-violet-950/60 text-violet-600 rounded-xl">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              ₹{Math.round(averageOrderValue).toLocaleString("en-IN")}
            </div>
            <span className="text-[11px] text-slate-400">
              Per Completed Purchase
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase tracking-wider">Active Customers</span>
              <div className="p-2 bg-rose-50 dark:bg-rose-950/60 text-rose-600 rounded-xl">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {totalCustomers}
            </div>
            <span className="text-[11px] text-rose-600 font-bold">
              Registered Accounts
            </span>
          </div>
        </div>

        {/* 2. Middle Grid: Low Stock Alert & Orders Breakdown (FR-DASH-02 & FR-DASH-03) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Low Stock Warning */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Inventory Alerts
              </h3>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                Low Stock
              </span>
            </div>

            <div className="space-y-3">
              {lowStockVariants.length === 0 ? (
                <p className="text-xs text-slate-500">All inventory levels are healthy!</p>
              ) : (
                lowStockVariants.map((v) => (
                  <div key={v.id} className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white truncate max-w-[180px]">
                        {v.product.name}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono">{v.sku}</p>
                    </div>
                    <span className="px-2 py-1 text-xs font-black bg-rose-100 dark:bg-rose-950/80 text-rose-600 rounded-lg">
                      {v.stock} left
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Orders by Status */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Fulfillment Pipeline by Status
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"].map((st) => (
                <div key={st} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{st}</span>
                  <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    {ordersByStatus[st] || 0}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Recent Orders Table (FR-AORD-01 & FR-AORD-02) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Recent Orders</h3>
              <p className="text-xs text-slate-500">Live feed of orders placed by customers</p>
            </div>
            <Link
              href="/admin/orders"
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              View All Orders →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-black tracking-wider text-[10px]">
                <tr>
                  <th className="p-4">Order Number</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Items</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {recentOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {o.orderNumber}
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-slate-900 dark:text-white">
                        {o.user?.name || o.guestEmail || "Guest"}
                      </p>
                      <p className="text-[11px] text-slate-500">{o.user?.email || o.guestEmail}</p>
                    </td>
                    <td className="p-4 text-slate-500">{o.items.length} items</td>
                    <td className="p-4 font-bold text-slate-900 dark:text-white">
                      ₹{Math.round(o.grandTotal).toLocaleString("en-IN")}
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {o.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400">
                      {new Date(o.createdAt).toLocaleDateString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
