"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ProductSortSelect({ currentSort = "newest" }: { currentSort?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", e.target.value);
    router.push(`/products?${params.toString()}`);
  };

  return (
    <select
      value={currentSort}
      onChange={handleSortChange}
      className="pl-3 pr-8 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 cursor-pointer shadow-sm text-slate-800 dark:text-slate-200"
    >
      <option value="newest">Newest Arrivals</option>
      <option value="name">Alphabetical (A-Z)</option>
      <option value="price-asc">Price: Low to High</option>
      <option value="price-desc">Price: High to Low</option>
    </select>
  );
}
