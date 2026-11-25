"use client";

import React, { useState } from "react";
import { RotateCcw } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/components/ui/Toast";

export default function ReorderButton({ items }: { items: { variantId: string; quantity: number }[] }) {
  const { addToCart } = useCart();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  if (items.length === 0) return null;

  const reorder = async () => {
    setBusy(true);
    let added = 0;
    let skipped = 0;
    for (const it of items) {
      const r = await addToCart(it.variantId, it.quantity);
      if (r.success) added++;
      else skipped++;
    }
    setBusy(false);
    if (added > 0) toast.success(skipped ? `Added ${added} item(s); ${skipped} unavailable.` : "Items added to your cart.");
    else toast.error("These items are currently unavailable.");
  };

  return (
    <button
      type="button"
      onClick={reorder}
      disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
    >
      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
      {busy ? "Adding..." : "Reorder"}
    </button>
  );
}
