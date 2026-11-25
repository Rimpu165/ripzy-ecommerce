import React from "react";

export interface Point {
  label: string;
  value: number;
}

const compact = (n: number) =>
  n >= 10000000 ? `${(n / 10000000).toFixed(1)}Cr` : n >= 100000 ? `${(n / 100000).toFixed(1)}L` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(Math.round(n));

/** Lightweight area/line chart (single series, inline SVG, server-renderable). Hover shows native tooltip. */
export function AreaChart({ data, format = (n) => n.toLocaleString("en-IN"), name }: { data: Point[]; format?: (n: number) => string; name: string }) {
  const W = 640, H = 220, L = 44, R = 12, T = 12, B = 26;
  const max = Math.max(1, ...data.map((d) => d.value));
  const x = (i: number) => L + (data.length <= 1 ? 0 : (i * (W - L - R)) / (data.length - 1));
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(" ");
  const area = data.length ? `${line} L${x(data.length - 1)},${H - B} L${x(0)},${H - B} Z` : "";
  const ticks = [0, 1, 2, 3, 4].map((t) => (max * t) / 4);
  const step = Math.max(1, Math.ceil(data.length / 6));
  return (
    <figure className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${name} over time`} className="h-auto w-full text-indigo-600">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="stroke-slate-200" strokeWidth={1} />
            <text x={L - 6} y={y(t) + 3} textAnchor="end" className="fill-slate-500 text-[10px]">{compact(t)}</text>
          </g>
        ))}
        {data.length > 0 && <path d={area} fill="currentColor" opacity={0.12} />}
        {data.length > 0 && <path d={line} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
        {data.map((d, i) => (
          <g key={i}>
            {i % step === 0 && (
              <text x={x(i)} y={H - 8} textAnchor="middle" className="fill-slate-500 text-[10px]">{d.label}</text>
            )}
            {d.value > 0 && (
              <circle cx={x(i)} cy={y(d.value)} r={data.length > 40 ? 1.5 : 3} fill="currentColor" className="stroke-white" strokeWidth={1.5} pointerEvents="none" />
            )}
            <circle cx={x(i)} cy={y(d.value)} r={10} fill="transparent">
              <title>{`${d.label}: ${format(d.value)}`}</title>
            </circle>
          </g>
        ))}
      </svg>
      <table className="sr-only">
        <caption>{name} by day</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}><th scope="row">{d.label}</th><td>{format(d.value)}</td></tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Horizontal bars with direct value labels (single hue; label text uses text tokens). */
export function HBars({ data, format = (n) => n.toLocaleString("en-IN") }: { data: Point[]; format?: (n: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (!data.length) return <p className="text-xs text-slate-500">No data in this period.</p>;
  return (
    <ul className="space-y-2.5">
      {data.map((d) => (
        <li key={d.label} className="text-xs" title={`${d.label}: ${format(d.value)}`}>
          <div className="mb-1 flex justify-between gap-2 text-slate-700">
            <span className="truncate font-semibold">{d.label}</span>
            <span className="font-bold tabular-nums">{format(d.value)}</span>
          </div>
          <div className="h-2 rounded-r-md bg-slate-100" role="presentation">
            <div className="h-2 rounded-r-md bg-indigo-600" style={{ width: `${Math.max(2, (d.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
