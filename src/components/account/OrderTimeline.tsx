import React from "react";
import { Check, X, Undo2 } from "lucide-react";

const FLOW = [
  { key: "PLACED", label: "Placed" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "SHIPPED", label: "Shipped" },
  { key: "DELIVERED", label: "Delivered" },
];

export interface HistoryEntry {
  status: string;
  note?: string | null;
  at: string;
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function stageIndex(status: string): number {
  switch (status) {
    case "PENDING_PAYMENT":
      return 0;
    case "CONFIRMED":
    case "PROCESSING":
      return 1;
    case "SHIPPED":
      return 2;
    case "DELIVERED":
    case "RETURNED":
    case "REFUNDED":
      return 3;
    default:
      return 0;
  }
}

/** Stepper (Placed -> Confirmed -> Shipped -> Delivered) with cancelled / returned variants, plus activity log. */
export default function OrderTimeline({
  status,
  placedAt,
  history,
}: {
  status: string;
  placedAt: string;
  history: HistoryEntry[];
}) {
  const cancelled = status === "CANCELLED";
  const returned = status === "RETURNED" || status === "REFUNDED";
  const current = stageIndex(status);

  const stampFor = (key: string): string | null => {
    if (key === "PLACED") return placedAt;
    const match = history.find((h) => (key === "CONFIRMED" ? h.status === "CONFIRMED" : h.status === key));
    return match ? match.at : null;
  };

  return (
    <div>
      <ol className="flex items-start" aria-label="Order progress">
        {FLOW.map((s, i) => {
          const done = !cancelled && i <= current;
          const isCurrent = !cancelled && i === current && status !== "DELIVERED" && !returned;
          const stamp = stampFor(s.key);
          return (
            <li key={s.key} className="relative flex-1 text-center" aria-current={isCurrent ? "step" : undefined}>
              {i > 0 && (
                <span
                  aria-hidden="true"
                  className={`absolute right-1/2 top-4 h-0.5 w-full -translate-y-1/2 ${done ? "bg-indigo-500" : "bg-slate-200"}`}
                />
              )}
              <span
                className={`relative mx-auto flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold ${
                  done
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-slate-200 bg-white text-slate-400"
                } ${isCurrent ? "ring-4 ring-indigo-100" : ""}`}
              >
                {done ? <Check className="h-4 w-4" aria-hidden="true" /> : i + 1}
              </span>
              <p className={`mt-2 text-xs font-medium ${done ? "text-slate-900" : "text-slate-400"}`}>{s.label}</p>
              {done && stamp && <p className="mt-0.5 hidden text-[11px] text-slate-500 sm:block">{fmt(stamp)}</p>}
            </li>
          );
        })}
      </ol>

      {cancelled && (
        <div className="mt-5 flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700" role="status">
          <X className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>This order was cancelled. Any prepaid amount is refunded to the original payment method.</span>
        </div>
      )}
      {returned && (
        <div className="mt-5 flex items-start gap-2 rounded-xl bg-slate-100 p-3 text-sm text-slate-700" role="status">
          <Undo2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>This order was returned{status === "REFUNDED" ? " and refunded" : ""}.</span>
        </div>
      )}

      {history.length > 0 && (
        <details className="mt-5 group">
          <summary className="cursor-pointer text-sm font-medium text-indigo-600 hover:underline">Activity log</summary>
          <ul className="mt-3 space-y-3 border-l border-slate-200 pl-4">
            {history.map((h, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-slate-300" aria-hidden="true" />
                <p className="text-sm font-medium text-slate-800">{h.status.replace(/_/g, " ")}</p>
                {h.note && <p className="text-xs text-slate-500">{h.note}</p>}
                <p className="text-xs text-slate-400">{fmt(h.at)}</p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
