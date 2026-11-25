export const inrFull = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

/** Compact INR for tight spaces: ₹850, ₹12.3k, ₹1.2L, ₹3.4Cr. */
export function inrCompact(n: number): string {
  const sign = n < 0 ? "-" : "";
  const a = Math.abs(n);
  const f = (v: number) => (v >= 10 ? v.toFixed(0) : v.toFixed(1)).replace(/\.0$/, "");
  if (a >= 10000000) return `${sign}₹${f(a / 10000000)}Cr`;
  if (a >= 100000) return `${sign}₹${f(a / 100000)}L`;
  if (a >= 10000) return `${sign}₹${f(a / 1000)}k`;
  return `${sign}₹${Math.round(a).toLocaleString("en-IN")}`;
}

export const numCompact = (n: number) => {
  const a = Math.abs(n);
  if (a >= 10000000) return `${(n / 10000000).toFixed(1)}Cr`;
  if (a >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (a >= 10000) return `${(n / 1000).toFixed(1)}k`;
  return Math.round(n).toLocaleString("en-IN");
};

export function timeAgo(d: Date | string, nowMs: number): string {
  const s = Math.max(0, Math.floor((nowMs - new Date(d).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export const pct = (n: number, digits = 1) => `${n.toFixed(digits).replace(/\.0$/, "")}%`;

export const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "Pending payment",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

export const STATUS_CHIP: Record<string, string> = {
  PENDING_PAYMENT: "bg-amber-50 text-amber-700",
  CONFIRMED: "bg-sky-50 text-sky-700",
  PROCESSING: "bg-indigo-50 text-indigo-700",
  SHIPPED: "bg-sky-50 text-sky-700",
  DELIVERED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-rose-50 text-rose-700",
  REFUNDED: "bg-slate-100 text-slate-600",
};
