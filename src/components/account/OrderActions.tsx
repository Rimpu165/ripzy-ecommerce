"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { XCircle, Undo2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { btnDanger, btnGhost, btnPrimary, inputCls, labelCls } from "./styles";

const RETURN_REASONS = ["Item damaged or defective", "Wrong item received", "Not as described", "No longer needed", "Other"];

interface Props {
  orderId: string;
  orderNumber: string;
  canCancel: boolean;
  canReturn: boolean;
  returnDeadline: string | null;
}

export default function OrderActions({ orderId, orderNumber, canCancel, canReturn, returnDeadline }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [panel, setPanel] = useState<"cancel" | "return" | null>(null);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  // Escape to close, focus the dialog on open, restore focus on close, lock body scroll.
  useEffect(() => {
    if (!panel) return;
    lastFocus.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLElement>("textarea, select, button")?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) setPanel(null);
      if (e.key === "Tab" && dialogRef.current) {
        const f = dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), textarea, select");
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      lastFocus.current?.focus?.();
    };
  }, [panel, busy]);

  if (!canCancel && !canReturn) return null;

  const submit = async (kind: "cancel" | "return") => {
    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(kind === "cancel" ? { reason } : { reason: reason || RETURN_REASONS[0], details }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Something went wrong.");
      } else {
        toast.success(kind === "cancel" ? data.message || "Order cancelled." : "Return request submitted.");
        setPanel(null);
        router.refresh();
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {canCancel && (
        <button
          type="button"
          onClick={() => {
            setReason("");
            setPanel("cancel");
          }}
          className={btnDanger}
        >
          <XCircle className="h-4 w-4" aria-hidden="true" /> Cancel order
        </button>
      )}
      {canReturn && (
        <button
          type="button"
          onClick={() => {
            setReason(RETURN_REASONS[0]);
            setPanel("return");
          }}
          className={btnGhost}
        >
          <Undo2 className="h-4 w-4" aria-hidden="true" /> Request return
        </button>
      )}

      {panel && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setPanel(null);
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-action-title"
            className="w-full max-w-md space-y-4 rounded-t-2xl border border-slate-200 bg-white p-6 shadow-card sm:rounded-2xl"
          >
            {panel === "cancel" ? (
              <>
                <h2 id="order-action-title" className="text-lg font-semibold text-slate-900">
                  Cancel {orderNumber}?
                </h2>
                <p className="text-sm text-slate-500">
                  Orders can be cancelled until they are shipped. Prepaid orders are refunded to the original payment method.
                </p>
                <div>
                  <label htmlFor="oa-reason" className={labelCls}>
                    Reason (optional)
                  </label>
                  <textarea id="oa-reason" rows={3} maxLength={300} className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} />
                </div>
              </>
            ) : (
              <>
                <h2 id="order-action-title" className="text-lg font-semibold text-slate-900">
                  Request a return
                </h2>
                {returnDeadline && (
                  <p className="text-sm text-slate-500">
                    Return window open until{" "}
                    {new Date(returnDeadline).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}.
                  </p>
                )}
                <div>
                  <label htmlFor="oa-rr" className={labelCls}>
                    Reason
                  </label>
                  <select id="oa-rr" className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)}>
                    {RETURN_REASONS.map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="oa-det" className={labelCls}>
                    Details (optional)
                  </label>
                  <textarea id="oa-det" rows={3} maxLength={1000} className={inputCls} value={details} onChange={(e) => setDetails(e.target.value)} />
                </div>
              </>
            )}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setPanel(null)} className={btnGhost} disabled={busy}>
                {panel === "cancel" ? "Keep order" : "Close"}
              </button>
              <button
                type="button"
                onClick={() => submit(panel)}
                disabled={busy}
                className={
                  panel === "cancel"
                    ? "inline-flex items-center justify-center rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                    : btnPrimary
                }
              >
                {busy ? "Please wait..." : panel === "cancel" ? "Confirm cancellation" : "Submit request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
