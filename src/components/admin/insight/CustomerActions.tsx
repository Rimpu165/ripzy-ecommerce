"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { btnGhostCls } from "./ui";

export default function CustomerActions({ id, isBlocked }: { id: string; isBlocked: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function run(action: string, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/customers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Action failed");
      toast.success("Done.");
      router.refresh();
      if (action === "delete") router.push("/admin/customers");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {isBlocked ? (
        <button disabled={busy} onClick={() => run("unblock")} className={btnGhostCls}>Unblock</button>
      ) : (
        <button disabled={busy} onClick={() => run("block", "Block this customer? They will be signed out immediately.")} className={btnGhostCls}>Block</button>
      )}
      <button disabled={busy} onClick={() => run("force_logout", "Sign this customer out of all devices?")} className={btnGhostCls}>Force logout</button>
      <button disabled={busy} onClick={() => run("delete", "Soft-delete this customer? Order history is preserved.")} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50">Delete</button>
    </div>
  );
}
