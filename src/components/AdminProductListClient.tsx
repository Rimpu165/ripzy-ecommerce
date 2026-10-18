"use client";

import React, { useState } from "react";
import { Plus, Minus, Search, AlertTriangle, Check } from "lucide-react";

interface Variant {
  id: string;
  sku: string;
  title: string;
  price: number;
  compareAtPrice?: number | null;
  stock: number;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  status: string;
  category?: { name: string } | null;
  brand?: { name: string } | null;
  variants: Variant[];
}

export default function AdminProductListClient({ initialProducts }: { initialProducts: Product[] }) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [search, setSearch] = useState("");
  const [adjustingId, setAdjustingId] = useState<string | null>(null);

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.variants.some((v) => v.sku.toLowerCase().includes(search.toLowerCase()))
  );

  const handleStockAdjust = async (variantId: string, changeQty: number) => {
    setAdjustingId(variantId);
    try {
      const res = await fetch("/api/admin/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId, changeQty, reason: changeQty > 0 ? "RESTOCK" : "MANUAL_ADJUSTMENT" }),
      });
      const data = await res.json();
      if (res.ok) {
        setProducts((prev) =>
          prev.map((prod) => ({
            ...prod,
            variants: prod.variants.map((v) =>
              v.id === variantId ? { ...v, stock: data.newStock } : v
            ),
          }))
        );
      } else {
        alert(data.error || "Failed to adjust stock");
      }
    } catch {
      alert("Network error");
    } finally {
      setAdjustingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="flex justify-between items-center gap-4">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products or SKU..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 shadow-sm"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-black tracking-wider text-[10px]">
              <tr>
                <th className="p-4">Product Name</th>
                <th className="p-4">Category</th>
                <th className="p-4">Variant & SKU</th>
                <th className="p-4">Selling Price</th>
                <th className="p-4">Available Stock</th>
                <th className="p-4 text-right">Quick Stock Adjustment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filteredProducts.map((p) =>
                p.variants.map((v, vIndex) => (
                  <tr key={v.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="p-4">
                      {vIndex === 0 ? (
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{p.name}</p>
                          <span className="text-[10px] text-indigo-600 font-semibold">{p.brand?.name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">↳ Same Product</span>
                      )}
                    </td>
                    <td className="p-4 text-slate-500">{p.category?.name || "General"}</td>
                    <td className="p-4">
                      <p className="font-bold text-slate-800 dark:text-slate-200">{v.title}</p>
                      <p className="font-mono text-[10px] text-slate-400">{v.sku}</p>
                    </td>
                    <td className="p-4 font-bold text-slate-900 dark:text-white">
                      ₹{v.price.toLocaleString("en-IN")}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                          v.stock <= 0
                            ? "bg-rose-100 text-rose-700"
                            : v.stock <= 5
                            ? "bg-amber-100 text-amber-700 animate-pulse"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {v.stock} units
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="inline-flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 rounded-xl p-1 bg-slate-50 dark:bg-slate-800">
                        <button
                          onClick={() => handleStockAdjust(v.id, -5)}
                          disabled={adjustingId === v.id || v.stock < 5}
                          className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 text-slate-700 dark:text-slate-200 text-[10px] font-bold disabled:opacity-40"
                          title="Deduct 5"
                        >
                          -5
                        </button>
                        <button
                          onClick={() => handleStockAdjust(v.id, -1)}
                          disabled={adjustingId === v.id || v.stock < 1}
                          className="p-1 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 text-slate-700 dark:text-slate-200 disabled:opacity-40"
                          title="Deduct 1"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleStockAdjust(v.id, 1)}
                          disabled={adjustingId === v.id}
                          className="p-1 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 text-slate-700 dark:text-slate-200"
                          title="Add 1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleStockAdjust(v.id, 10)}
                          disabled={adjustingId === v.id}
                          className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold"
                          title="Restock +10"
                        >
                          +10
                        </button>
                      </div>
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
