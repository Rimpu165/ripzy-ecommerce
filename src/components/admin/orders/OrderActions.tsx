"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { SectionCard, FormField } from "@/components/admin/ui/Form";
import { ConfirmDialog } from "@/components/admin/ui/Modal";
import { inputCls, btnPrimary, btnSecondary, btnDangerSolid } from "@/components/admin/ui/tokens";

interface Props {
  orderId: string;
  status: string;
  transitions: string[];
  canCancel: boolean;
  canUpdate: boolean;
  canRefund: boolean;
  hasShipment: boolean;
  paymentOptions: { id: string; label: string; remaining: number }[];
  pendingRefunds: { id: string; amount: number; cod: boolean }[];
}

const full = "w-full";

export default function OrderActions(p: Props) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [showShip, setShowShip] = useState(false);
  const [ship, setShip] = useState({ courierName: "", trackingNumber: "", trackingUrl: "", estimatedDelivery: "" });
  const [refund, setRefund] = useState({ paymentId: p.paymentOptions[0]?.id ?? "", amount: "", reason: "" });

  async function call(url: string, body: unknown, okMsg: string) {
    setBusy(true);
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Request failed");
      toast.success(okMsg);
      router.refresh();
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Request failed");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const needsShipForm = p.status === "PROCESSING" || (p.status === "SHIPPED" && p.canUpdate);
  const selectedPay = p.paymentOptions.find((o) => o.id === refund.paymentId);

  return (
    <div className="space-y-6">
      {p.canUpdate && (p.transitions.length > 0 || needsShipForm || p.canCancel) && (
        <SectionCard title="Actions" description="Move the order through its lifecycle.">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {p.transitions
                .filter((s) => !(s === "SHIPPED"))
                .map((s) => (
                  <button
                    key={s}
                    disabled={busy}
                    onClick={() => call("/api/admin/orders/status", { orderId: p.orderId, newStatus: s }, `Order marked ${s}`)}
                    className={btnPrimary}
                  >
                    Mark {s.toLowerCase().replace("_", " ")}
                  </button>
                ))}
              {needsShipForm && (
                <button onClick={() => setShowShip((v) => !v)} aria-expanded={showShip} className={btnSecondary}>
                  {p.status === "SHIPPED" || p.hasShipment ? "Edit courier / tracking" : "Ship with courier"}
                </button>
              )}
            </div>

            {showShip && (
              <form
                className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (await call("/api/admin/orders/shipment", { orderId: p.orderId, ...ship }, "Shipment saved")) setShowShip(false);
                }}
              >
                <FormField label="Courier" htmlFor="ship-courier" required>
                  <input id="ship-courier" required placeholder="e.g. Delhivery" className={inputCls} value={ship.courierName} onChange={(e) => setShip({ ...ship, courierName: e.target.value })} />
                </FormField>
                <FormField label="Tracking number" htmlFor="ship-track" required>
                  <input id="ship-track" required className={inputCls} value={ship.trackingNumber} onChange={(e) => setShip({ ...ship, trackingNumber: e.target.value })} />
                </FormField>
                <FormField label="Tracking URL" htmlFor="ship-url" hint="Optional. Shown to the customer.">
                  <input id="ship-url" type="url" placeholder="https://" className={inputCls} value={ship.trackingUrl} onChange={(e) => setShip({ ...ship, trackingUrl: e.target.value })} />
                </FormField>
                <FormField label="Estimated delivery" htmlFor="ship-eta">
                  <input id="ship-eta" type="date" className={inputCls} value={ship.estimatedDelivery} onChange={(e) => setShip({ ...ship, estimatedDelivery: e.target.value })} />
                </FormField>
                <button disabled={busy} className={`${btnPrimary} ${full}`}>
                  Save shipment
                </button>
              </form>
            )}

            {p.canCancel && (
              <form
                className="space-y-3 border-t border-slate-100 pt-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  setConfirmCancel(true);
                }}
              >
                <FormField label="Cancellation reason" htmlFor="cancel-reason" hint="At least 3 characters. Recorded in the order timeline.">
                  <input id="cancel-reason" required minLength={3} className={inputCls} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
                </FormField>
                <button disabled={busy} className={`${btnDangerSolid} ${full}`}>
                  Cancel order
                </button>
              </form>
            )}
          </div>
        </SectionCard>
      )}

      {p.canRefund && (p.paymentOptions.length > 0 || p.pendingRefunds.length > 0) && (
        <SectionCard title="Refund">
          <div className="space-y-3">
            {p.pendingRefunds.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <span>
                  Pending Rs. {r.amount.toLocaleString("en-IN")} {r.cod ? "(COD, manual)" : ""}
                </span>
                <button
                  disabled={busy}
                  onClick={() =>
                    call(
                      "/api/admin/refunds",
                      { orderId: p.orderId, refundRowId: r.id, reason: r.cod ? "Manual COD payout completed" : "Process pending refund", markManualDone: r.cod },
                      r.cod ? "Marked as paid out" : "Refund processed"
                    )
                  }
                  className={`${btnSecondary} !px-3 !py-1.5 !text-xs`}
                >
                  {r.cod ? "Mark paid out" : "Process"}
                </button>
              </div>
            ))}
            {p.paymentOptions.length > 0 && (
              <form
                className="space-y-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const amount = refund.amount ? Number(refund.amount) : undefined;
                  if (await call("/api/admin/refunds", { orderId: p.orderId, paymentId: refund.paymentId, amount, reason: refund.reason }, "Refund issued")) {
                    setRefund({ ...refund, amount: "", reason: "" });
                  }
                }}
              >
                <FormField label="Payment to refund" htmlFor="rf-pay">
                  <select id="rf-pay" className={inputCls} value={refund.paymentId} onChange={(e) => setRefund({ ...refund, paymentId: e.target.value })}>
                    {p.paymentOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label} (refundable Rs. {o.remaining.toLocaleString("en-IN")})
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Amount (Rs.)" htmlFor="rf-amt" hint={`Leave blank to refund the full ${selectedPay?.remaining ?? ""}.`}>
                  <input id="rf-amt" type="number" step="0.01" min="0.01" max={selectedPay?.remaining} className={inputCls} value={refund.amount} onChange={(e) => setRefund({ ...refund, amount: e.target.value })} />
                </FormField>
                <FormField label="Reason" htmlFor="rf-reason" required>
                  <input id="rf-reason" required minLength={3} className={inputCls} value={refund.reason} onChange={(e) => setRefund({ ...refund, reason: e.target.value })} />
                </FormField>
                <button disabled={busy} className={`${btnPrimary} ${full}`}>
                  Issue refund
                </button>
              </form>
            )}
          </div>
        </SectionCard>
      )}

      {p.canUpdate && (
        <SectionCard title="Internal note" description="Visible to staff only.">
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await call("/api/admin/orders/note", { orderId: p.orderId, note }, "Note added")) setNote("");
            }}
          >
            <textarea required aria-label="Internal note" rows={3} maxLength={1000} placeholder="Write a note for your team" className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} />
            <button disabled={busy} className={`${btnSecondary} ${full}`}>
              Add note
            </button>
          </form>
        </SectionCard>
      )}

      <ConfirmDialog
        open={confirmCancel}
        danger
        title="Cancel this order?"
        message="Stock will be restored and any prepaid amount queued for refund."
        confirmLabel="Cancel order"
        busy={busy}
        onCancel={() => setConfirmCancel(false)}
        onConfirm={async () => {
          if (await call("/api/admin/orders/cancel", { orderId: p.orderId, reason: cancelReason }, "Order cancelled")) setCancelReason("");
          setConfirmCancel(false);
        }}
      />
    </div>
  );
}
