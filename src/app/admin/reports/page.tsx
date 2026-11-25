import React from "react";
import { redirect } from "next/navigation";
import { Download, FileSpreadsheet, Package, Receipt, ShoppingBag, Users } from "lucide-react";
import { getAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";

import { PageHeader } from "@/components/admin/ui/PageHeader";

import { StatCard } from "@/components/admin/ui/StatCard";

import { btnSecondary, inr } from "@/components/admin/ui/tokens";

export const dynamic = "force-dynamic";
const PAID = ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"];

const EXPORTS = [
  { type: "orders", title: "Orders Master Report", desc: "All orders with customer, status, subtotal, discount, tax and grand total.", icon: FileSpreadsheet, tone: "indigo" },
  { type: "inventory", title: "Inventory Valuation", desc: "Stock valuation by SKU with reserved stock and low-stock thresholds.", icon: Package, tone: "emerald" },
  { type: "tax", title: "GST / Tax Filing", desc: "Taxable value, CGST, SGST and totals for paid orders (GSTR-1 prep).", icon: Receipt, tone: "rose" },
  { type: "products", title: "Products Report", desc: "Catalogue with price range, stock, units sold and revenue per product.", icon: ShoppingBag, tone: "indigo" },
  { type: "customers", title: "Customers Report", desc: "Customer list with lifetime spend, joined and last login dates.", icon: Users, tone: "emerald", perm: "customers.view" as const },
] as const;

export default async function AdminReportsPage() {
  const user = await getAdminUser("reports.view");
  if (!user) redirect("/admin");

  const [paid, variants] = await Promise.all([
    prisma.order.aggregate({ where: { status: { in: PAID } }, _sum: { grandTotal: true, taxTotal: true }, _count: { _all: true } }),
    prisma.productVariant.findMany({ select: { price: true, stock: true } }),
  ]);
  const value = variants.reduce((s, v) => s + v.price * v.stock, 0);
  const units = variants.reduce((s, v) => s + v.stock, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="CSV exports for bookkeeping, tax compliance and stock audits. Every export is audited." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Gross sales (paid orders)" value={inr(paid._sum.grandTotal ?? 0)} hint={`${paid._count._all} orders, excludes cancelled and refunded`} icon={ShoppingBag} tone="indigo" />
        <StatCard label="GST collected" value={inr(paid._sum.taxTotal ?? 0)} hint="CGST + SGST on paid orders" icon={Receipt} tone="sky" />
        <StatCard label="Warehouse stock value" value={inr(value)} hint={`${units.toLocaleString("en-IN")} units`} icon={Package} tone="emerald" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {EXPORTS.filter((e) => !("perm" in e) || can(user.role, e.perm)).map((e) => (
          <div key={e.type} className="card flex flex-col justify-between gap-4 p-5">
            <div className="space-y-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <e.icon className="h-4 w-4" aria-hidden />
              </span>
              <h3 className="text-sm font-semibold text-slate-900">{e.title}</h3>
              <p className="text-sm leading-relaxed text-slate-500">{e.desc}</p>
            </div>
            <a href={`/api/admin/reports/export?type=${e.type}`} download className={btnSecondary}>
              <Download className="h-4 w-4" /> Export CSV
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
