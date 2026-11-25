"use client";

import React, { useMemo, useRef, useState } from "react";
import { inrCompact, inrFull, numCompact } from "./format";

export interface TrendPoint {
  label: string;
  revenue: number;
  orders: number;
  prevRevenue: number;
  prevOrders: number;
}

const W = 760, H = 270, L = 48, R = 14, T = 14, B = 28;

/** Area chart with previous-period dashed overlay, crosshair + tooltip, and a Revenue/Orders toggle. */
export default function TrendChart({ data, showRevenue, prevTitle }: { data: TrendPoint[]; showRevenue: boolean; prevTitle: string }) {
  const [metric, setMetric] = useState<"revenue" | "orders">(showRevenue ? "revenue" : "orders");
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);

  const isRev = metric === "revenue";
  const cur = useMemo(() => data.map((d) => (isRev ? d.revenue : d.orders)), [data, isRev]);
  const prev = useMemo(() => data.map((d) => (isRev ? d.prevRevenue : d.prevOrders)), [data, isRev]);
  const fmt = (n: number) => (isRev ? inrFull(n) : n.toLocaleString("en-IN"));
  const short = (n: number) => (isRev ? inrCompact(n) : numCompact(n));

  const rawMax = Math.max(1, ...cur, ...prev);
  const max = isRev ? rawMax : Math.max(4, rawMax);
  const x = (i: number) => L + (data.length <= 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (data.length - 1));
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const path = (arr: number[]) => arr.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const ticks = [0, 1, 2, 3, 4].map((t) => (max * t) / 4);
  const step = Math.max(1, Math.ceil(data.length / 7));
  const total = cur.reduce((s, v) => s + v, 0);
  const prevTotal = prev.reduce((s, v) => s + v, 0);

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect || !data.length) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - L) / (W - L - R)) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, data.length <= 1 ? 0 : i)));
  }

  const hasData = total > 0 || prevTotal > 0;
  const tipLeft = hover === null ? 0 : (x(hover) / W) * 100;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-indigo-600" /> This period</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-0 w-4 border-t-2 border-dashed border-slate-400" /> {prevTitle.charAt(0).toUpperCase() + prevTitle.slice(1)}</span>
        </div>
        {showRevenue && (
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-medium" role="group" aria-label="Chart metric">
            {(["revenue", "orders"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMetric(m)}
                aria-pressed={metric === m}
                className={`rounded-md px-3 py-1 capitalize transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${metric === m ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                {m}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative">
        <svg
          ref={ref}
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`${isRev ? "Revenue" : "Orders"} over time compared with ${prevTitle}`}
          className="h-auto w-full touch-pan-y select-none"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          {ticks.map((tk) => (
            <g key={tk}>
              <line x1={L} x2={W - R} y1={y(tk)} y2={y(tk)} className="stroke-slate-100" strokeWidth={1} />
              <text x={L - 8} y={y(tk) + 3} textAnchor="end" className="fill-slate-400 text-[10px]">{short(tk)}</text>
            </g>
          ))}
          {data.map((d, i) =>
            i % step === 0 ? (
              <text key={i} x={x(i)} y={H - 8} textAnchor="middle" className="fill-slate-400 text-[10px]">{d.label}</text>
            ) : null
          )}
          {hasData && (
            <>
              <path d={`${path(cur)} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} className="fill-indigo-600" opacity={0.08} />
              <path d={path(prev)} fill="none" className="stroke-slate-400" strokeWidth={1.5} strokeDasharray="5 4" strokeLinejoin="round" />
              <path d={path(cur)} fill="none" className="stroke-indigo-600" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            </>
          )}
          {hover !== null && (
            <g pointerEvents="none">
              <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} className="stroke-slate-300" strokeWidth={1} />
              <circle cx={x(hover)} cy={y(prev[hover])} r={3.5} className="fill-slate-400 stroke-white" strokeWidth={2} />
              <circle cx={x(hover)} cy={y(cur[hover])} r={4.5} className="fill-indigo-600 stroke-white" strokeWidth={2} />
            </g>
          )}
        </svg>

        {!hasData && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center pb-6">
            <p className="rounded-full bg-slate-50 px-3 py-1 text-xs text-slate-500">No data in this period</p>
          </div>
        )}

        {hover !== null && hasData && (
          <div
            className="pointer-events-none absolute top-1 z-10 w-40 rounded-xl border border-slate-200 bg-white p-2.5 text-xs shadow-card"
            style={{ left: `${tipLeft}%`, transform: `translateX(${tipLeft > 65 ? "calc(-100% - 10px)" : "10px"})` }}
            role="status"
          >
            <p className="mb-1 font-semibold text-slate-900">{data[hover].label}</p>
            <p className="flex items-center justify-between gap-2 text-slate-600">
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-indigo-600" />Now</span>
              <span className="font-semibold tabular-nums text-slate-900">{fmt(cur[hover])}</span>
            </p>
            <p className="flex items-center justify-between gap-2 text-slate-500">
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-slate-400" />Before</span>
              <span className="tabular-nums">{fmt(prev[hover])}</span>
            </p>
          </div>
        )}
      </div>

      <table className="sr-only">
        <caption>{isRev ? "Revenue" : "Orders"} by period</caption>
        <thead><tr><th>Period</th><th>This period</th><th>{prevTitle}</th></tr></thead>
        <tbody>
          {data.map((d, i) => (
            <tr key={i}><th scope="row">{d.label}</th><td>{fmt(cur[i])}</td><td>{fmt(prev[i])}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
