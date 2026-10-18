import React from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import AdminOrderListClient from "@/components/AdminOrderListClient";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const user = await getCurrentUser();

  if (!user || !["STAFF", "MANAGER", "SUPER_ADMIN"].includes(user.role)) {
    redirect("/login?next=/admin/orders");
  }

  const orders = await prisma.order.findMany({
    include: {
      user: { select: { name: true, email: true } },
      items: true,
      payments: true,
      shipments: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20">
      <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="p-1 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="font-extrabold text-base">Order Management & Fulfillment</span>
        </div>
        <span className="text-xs text-slate-400">Total: {orders.length} orders</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            Orders Lifecycle
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Enforce status transitions: CONFIRMED ➔ PROCESSING ➔ SHIPPED ➔ DELIVERED
          </p>
        </div>

        <AdminOrderListClient initialOrders={orders as any} />
      </div>
    </div>
  );
}
