import React from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import {
  FileSpreadsheet,
  Download,
  ArrowLeft,
  DollarSign,
  Package,
  Receipt,
  TrendingUp,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const user = await getCurrentUser();

  if (!user || !["MANAGER", "SUPER_ADMIN"].includes(user.role)) {
    redirect("/login?next=/admin/reports");
  }

  // Aggregate metrics for reports
  const [orders, variants] = await Promise.all([
    prisma.order.findMany({ select: { subtotal: true, discountTotal: true, taxTotal: true, grandTotal: true, status: true } }),
    prisma.productVariant.findMany({ select: { price: true, stock: true } }),
  ]);

  const totalGrossRevenue = orders.reduce((sum, o) => sum + o.grandTotal, 0);
  const totalGstCollected = orders.reduce((sum, o) => sum + o.taxTotal, 0);
  const totalInventoryValuation = variants.reduce((sum, v) => sum + v.price * v.stock, 0);
  const totalUnitsInStock = variants.reduce((sum, v) => sum + v.stock, 0);

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20">
      <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="p-1 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="font-extrabold text-base">Financial & Inventory Reports</span>
        </div>
        <span className="text-xs text-slate-400">Export Engine</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            Business Intelligence & Reports
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Download raw CSV / Excel compatible reports for bookkeeping, tax compliance, and stock auditing.
          </p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500">Gross Sales Volume</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              ₹{Math.round(totalGrossRevenue).toLocaleString("en-IN")}
            </div>
            <p className="text-xs text-emerald-600 font-semibold">All completed & COD orders</p>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500">GST Collected (18%)</span>
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
              ₹{Math.round(totalGstCollected).toLocaleString("en-IN")}
            </div>
            <p className="text-xs text-slate-500">CGST (9%) + SGST (9%)</p>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500">Total Warehouse Stock Value</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              ₹{Math.round(totalInventoryValuation).toLocaleString("en-IN")}
            </div>
            <p className="text-xs text-slate-500">{totalUnitsInStock} total units across all variants</p>
          </div>
        </div>

        {/* 1-Click CSV Downloads (FR-RPT-05) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Orders CSV */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center font-bold">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Orders Master Report
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Full export of all customer orders, including customer details, date, order status, subtotal, discount, tax, and grand total.
              </p>
            </div>
            <a
              href="/api/admin/reports/export?type=orders"
              download
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all"
            >
              <Download className="w-4 h-4" /> Export Orders CSV
            </a>
          </div>

          {/* Inventory Valuation CSV */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold">
                <Package className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Inventory Valuation Report
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Comprehensive stock valuation by variant SKU, selling price, current available stock, reserved stock, and asset value.
              </p>
            </div>
            <a
              href="/api/admin/reports/export?type=inventory"
              download
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all"
            >
              <Download className="w-4 h-4" /> Export Inventory CSV
            </a>
          </div>

          {/* GST Tax Filing CSV */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950 text-rose-600 flex items-center justify-center font-bold">
                <Receipt className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                GST / Tax Filing Report
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Tax liability report with taxable subtotal, CGST (9%), SGST (9%), and total tax liability for monthly GSTR-1 preparation.
              </p>
            </div>
            <a
              href="/api/admin/reports/export?type=tax"
              download
              className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-rose-600/20 transition-all"
            >
              <Download className="w-4 h-4" /> Export GST Tax CSV
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
