"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Undo2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { DataTable } from "@/components/admin/ui/DataTable";
import { Drawer, ConfirmDialog } from "@/components/admin/ui/Modal";
import { EmptyCard } from "@/components/admin/ui/EmptyState";
import { FormField } from "@/components/admin/ui/Form";
import { inputCls, btnPrimary, btnDangerSolid, btnSecondary, thCls, tdCls } from "@/components/admin/ui/tokens";

export interface ReturnRow {
  id: string;
  status: string;
  reason: string;
  details: string | null;
  adminNote: string | null;
  refundAmount: number | null;
  createdAt: string;
  customer: string;
  email: string;
  orderId: string;
  orderNumber: string;
  orderTotal: number;
  items: { productName: string; variantTitle: string; quantity: number }[];
}

export default function AdminReturnsClient({ rows, canRefund }: { rows: ReturnRow[]; canRefund: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState<ReturnRow | null>(null);
  const [note, setNote] = useState("");
  const [restock, setRestock] = useState(true);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<"REJECT" | "REFUND" | null>(null);

  async function act(action: "APPROVE" | "REJECT" | "RECEIVE" | "REFUND") {
    if (!open) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          returnId: open.id,
          action,
          note: note || undefined,
          restock: action === "RECEIVE" ? restock : undefined,
          amount: action === "REFUND" && amount ? Number(amount) : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Action failed");
      toast.success(`Return ${data.status?.toLowerCase()}`);
      setOpen(null);
      setConfirm(null);
      setNote("");
      setAmount("");
      router.refresh();
    } catch (e) {
      setConfirm(null);
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  const canAct = open ? ["REQUESTED", "APPROVED", "RECEIVED"].includes(open.status) : false;
  const itemsText = (r: ReturnRow) => r.items.map((i) => `${i.quantity} x ${i.productName}`).join(", ");
  const review = (r: ReturnRow) => {
    setOpen(r);
    setNote(r.adminNote ?? "");
  };

  return (
    <>
      {rows.length === 0 ? (
        <EmptyCard icon={Undo2} title="No return requests" description="Nothing in this state right now." />
      ) : (
        <>
          {/* Mobile cards */}
          <ul className="space-y-3 md:hidden">
            {rows.map((r) => (
              <li key={r.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-indigo-600">{r.orderNumber}</p>
                    <p className="truncate text-sm text-slate-700">{r.customer}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-slate-600">{r.reason}</p>
                <p className="mt-1 truncate text-xs text-slate-500">{itemsText(r)}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-slate-500">{new Date(r.createdAt).toLocaleDateString("en-IN")}</span>
                  <button onClick={() => review(r)} className={`${btnSecondary} !px-3 !py-1.5 !text-xs`}>
                    Review
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="hidden md:block">
            <DataTable minWidth={720} label="Return requests">
              <thead>
                <tr>
                  <th className={thCls}>Order</th>
                  <th className={thCls}>Customer</th>
                  <th className={thCls}>Reason</th>
                  <th className={thCls}>Requested</th>
                  <th className={thCls}>Status</th>
                  <th className={thCls}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className={`${tdCls} font-medium text-indigo-600`}>{r.orderNumber}</td>
                    <td className={tdCls}>
                      <div className="font-medium text-slate-800">{r.customer}</div>
                      <div className="text-xs text-slate-500">{r.email}</div>
                    </td>
                    <td className={`${tdCls} max-w-xs truncate`}>{r.reason}</td>
                    <td className={`${tdCls} whitespace-nowrap`}>{new Date(r.createdAt).toLocaleDateString("en-IN")}</td>
                    <td className={tdCls}>
                      <StatusBadge status={r.status} />
                    </td>
                    <td className={`${tdCls} text-right`}>
                      <button
                        onClick={() => review(r)}
                        className="rounded font-medium text-indigo-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </div>
        </>
      )}

      {open && (
        <Drawer title={open.orderNumber} description={`Return request from ${open.customer}`} onClose={() => setOpen(null)}>
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <StatusBadge status={open.status} />
              <Link href={`/admin/orders/${open.orderId}`} className="text-indigo-600 hover:underline">
                View order
              </Link>
            </div>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Customer</dt>
                <dd className="text-slate-800">
                  {open.customer} ({open.email})
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Reason</dt>
                <dd className="text-slate-800">{open.reason}</dd>
              </div>
              {open.details && (
                <div>
                  <dt className="text-xs text-slate-500">Details</dt>
                  <dd className="text-slate-800">{open.details}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-slate-500">Items</dt>
                <dd className="text-slate-800">{open.items.map((i) => `${i.quantity} x ${i.productName} (${i.variantTitle})`).join(", ")}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Order total</dt>
                <dd className="text-slate-800">Rs. {open.orderTotal.toLocaleString("en-IN")}</dd>
              </div>
              {open.refundAmount != null && (
                <div>
                  <dt className="text-xs text-slate-500">Refund amount</dt>
                  <dd className="text-slate-800">Rs. {open.refundAmount.toLocaleString("en-IN")}</dd>
                </div>
              )}
            </dl>

            {canAct && (
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <FormField label="Admin note" htmlFor="ret-note" hint={open.status === "REQUESTED" ? "Required to reject; shared with the customer." : undefined}>
                  <textarea id="ret-note" rows={3} maxLength={500} className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} />
                </FormField>
                {open.status === "REQUESTED" && (
                  <div className="flex gap-2">
                    <button disabled={busy} onClick={() => act("APPROVE")} className={`${btnPrimary} flex-1`}>
                      Approve
                    </button>
                    <button disabled={busy || !note.trim()} onClick={() => setConfirm("REJECT")} className={`${btnDangerSolid} flex-1`}>
                      Reject
                    </button>
                  </div>
                )}
                {open.status === "APPROVED" && (
                  <>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} className="rounded border-slate-300" /> Restock returned items
                    </label>
                    <button disabled={busy} onClick={() => act("RECEIVE")} className={`${btnPrimary} w-full`}>
                      Mark as received
                    </button>
                  </>
                )}
                {open.status === "RECEIVED" &&
                  (canRefund ? (
                    <>
                      <FormField label="Refund amount (Rs.)" htmlFor="ret-amt" hint="Leave blank to refund the remaining balance.">
                        <input id="ret-amt" type="number" step="0.01" min="0.01" className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} />
                      </FormField>
                      <button disabled={busy} onClick={() => setConfirm("REFUND")} className={`${btnPrimary} w-full`}>
                        Issue refund
                      </button>
                    </>
                  ) : (
                    <p className="text-sm text-slate-500">A manager must issue the refund.</p>
                  ))}
              </div>
            )}
            {open.adminNote && !canAct && <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">Admin note: {open.adminNote}</p>}
          </div>
        </Drawer>
      )}

      <ConfirmDialog
        open={confirm !== null}
        danger={confirm === "REJECT"}
        title={confirm === "REJECT" ? "Reject this return?" : "Issue refund?"}
        message={
          confirm === "REJECT"
            ? "The customer will be notified with your note. This cannot be undone."
            : amount
              ? `Rs. ${Number(amount).toLocaleString("en-IN")} will be refunded to the customer.`
              : "The remaining balance will be refunded to the customer."
        }
        confirmLabel={confirm === "REJECT" ? "Reject return" : "Issue refund"}
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm && act(confirm)}
      />
    </>
  );
}
