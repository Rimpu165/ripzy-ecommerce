import React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { qs } from "./tokens";

const btn =
  "inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40";

/** Link-based pagination. Provide either `hrefFor` (client parents) or `base` + `params` (server pages). */
export function Pagination({
  page,
  pageSize,
  total,
  pages: pagesProp,
  base,
  params = {},
  hrefFor,
}: {
  page: number;
  pageSize?: number;
  total: number;
  pages?: number;
  base?: string;
  params?: Record<string, string | undefined>;
  hrefFor?: (p: number) => string;
}) {
  const pages = pagesProp ?? Math.max(1, Math.ceil(total / (pageSize ?? 20)));
  const href = (p: number) => (hrefFor ? hrefFor(p) : qs(base ?? "", { ...params, page: p > 1 ? p : undefined }));
  const from = pageSize ? Math.min(total, (page - 1) * pageSize + 1) : null;
  const to = pageSize ? Math.min(total, page * pageSize) : null;
  return (
    <nav aria-label="Pagination" className="mt-4 flex flex-col items-center justify-between gap-3 text-sm text-slate-500 sm:flex-row">
      <span>
        {total === 0
          ? "No results"
          : from !== null
            ? `Showing ${from.toLocaleString("en-IN")}–${to!.toLocaleString("en-IN")} of ${total.toLocaleString("en-IN")}`
            : `${total.toLocaleString("en-IN")} results`}
        <span className="mx-1.5 text-slate-300">·</span>Page {page} of {pages}
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} className={`${btn} hover:bg-slate-50`}>
            <ChevronLeft className="h-4 w-4" /> Previous
          </Link>
        ) : (
          <span aria-disabled className={`${btn} cursor-not-allowed opacity-40`}>
            <ChevronLeft className="h-4 w-4" /> Previous
          </span>
        )}
        {page < pages ? (
          <Link href={href(page + 1)} className={`${btn} hover:bg-slate-50`}>
            Next <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <span aria-disabled className={`${btn} cursor-not-allowed opacity-40`}>
            Next <ChevronRight className="h-4 w-4" />
          </span>
        )}
      </div>
    </nav>
  );
}
