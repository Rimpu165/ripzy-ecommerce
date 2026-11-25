"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ProductSortSelect({ currentSort = "newest" }: { currentSort?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", e.target.value);
    params.delete("page");
    router.push(`/products?${params.toString()}`);
  };

  return (
    <select
      id="sort-select"
      value={currentSort}
      onChange={handleSortChange}
      className="cursor-pointer rounded-xl border border-slate-300 bg-white py-2 pl-3 pr-8 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
    >
      <option value="newest">Newest arrivals</option>
      <option value="name">Alphabetical (A-Z)</option>
      <option value="price-asc">Price: Low to High</option>
      <option value="price-desc">Price: High to Low</option>
    </select>
  );
}
