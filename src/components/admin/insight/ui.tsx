import React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
export const fmtDate = (d: Date | string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
export const fmtDateTime = (d: Date | string | null | undefined) =>
  d
    ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-black text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function Card({ title, action, children, className = "" }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-sm font-extrabold text-slate-900">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

const TONES = {
  green: "bg-emerald-100 text-emerald-800",
  red: "bg-rose-100 text-rose-800",
  amber: "bg-amber-100 text-amber-800",
  indigo: "bg-indigo-100 text-indigo-800",
  slate: "bg-slate-100 text-slate-700",
};
export function Badge({ tone = "slate", children }: { tone?: keyof typeof TONES; children: React.ReactNode }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${TONES[tone]}`}>
      {children}
    </span>
  );
}

export const inputCls =
  "rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500";
export const btnCls =
  "rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50";
export const btnGhostCls =
  "rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50";
export const thCls = "p-3 text-[10px] font-black uppercase tracking-wider text-slate-500";

export function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function qs(base: string, params: Record<string, string | number | undefined | null>) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") u.set(k, String(v));
  const s = u.toString();
  return s ? `${base}?${s}` : base;
}

export function Pagination({
  base,
  params,
  page,
  pageSize,
  total,
}: {
  base: string;
  params: Record<string, string | undefined>;
  page: number;
  pageSize: number;
  total: number;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const link = "inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold";
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between pt-4 text-xs text-slate-500">
      <span>
        {total.toLocaleString("en-IN")} result{total === 1 ? "" : "s"} · page {page} of {pages}
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={qs(base, { ...params, page: page - 1 })} className={`${link} hover:bg-slate-50`}>
            <ChevronLeft className="h-3.5 w-3.5" /> Prev
          </Link>
        ) : (
          <span className={`${link} opacity-40`}><ChevronLeft className="h-3.5 w-3.5" /> Prev</span>
        )}
        {page < pages ? (
          <Link href={qs(base, { ...params, page: page + 1 })} className={`${link} hover:bg-slate-50`}>
            Next <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <span className={`${link} opacity-40`}>Next <ChevronRight className="h-3.5 w-3.5" /></span>
        )}
      </div>
    </nav>
  );
}

export function pageParam(v: string | string[] | undefined) {
  const n = parseInt(Array.isArray(v) ? v[0] : v || "1", 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 100000) : 1;
}
export const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
