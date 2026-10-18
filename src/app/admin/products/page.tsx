import React from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import AdminProductListClient from "@/components/AdminProductListClient";
import { ArrowLeft, Box } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const user = await getCurrentUser();

  if (!user || !["STAFF", "MANAGER", "SUPER_ADMIN"].includes(user.role)) {
    redirect("/login?next=/admin/products");
  }

  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    include: {
      brand: true,
      category: true,
      variants: {
        orderBy: { price: "asc" },
      },
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
          <span className="font-extrabold text-base">Product Master & Inventory</span>
        </div>
        <span className="text-xs text-slate-400">Total Products: {products.length}</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            Inventory & Stock Manager
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Adjust stock levels per variant. Every change is recorded in the immutable inventory ledger.
          </p>
        </div>

        <AdminProductListClient initialProducts={products as any} />
      </div>
    </div>
  );
}
