/** Shared class tokens + formatters for admin pages (light enterprise theme). */
export const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40";

export const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-50 disabled:text-slate-500";
export const selectCls = inputCls;
export const labelCls = "mb-1 block text-xs font-medium text-slate-600";

export const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50";
export const btnSecondary =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-50";
export const btnDanger =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/40 disabled:cursor-not-allowed disabled:opacity-50";
export const btnDangerSolid =
  "inline-flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/40 disabled:cursor-not-allowed disabled:opacity-50";
export const btnSm = "!px-2.5 !py-1.5 !text-xs";

export const thCls = "whitespace-nowrap px-4 py-3 text-left text-xs font-medium text-slate-500";
export const tdCls = "px-4 py-3 align-middle text-sm text-slate-700";

export const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
export const fmtDate = (d: Date | string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
export const fmtDateTime = (d: Date | string | null | undefined) =>
  d
    ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";

export function qs(base: string, params: Record<string, string | number | undefined | null | boolean>) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "" && v !== false) u.set(k, String(v));
  const s = u.toString();
  return s ? `${base}?${s}` : base;
}
export function pageParam(v: string | string[] | undefined) {
  const n = parseInt(Array.isArray(v) ? v[0] : v || "1", 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 100000) : 1;
}
export const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
