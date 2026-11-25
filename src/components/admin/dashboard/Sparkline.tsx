import React from "react";

/** Tiny inline-SVG trend line. Decorative (the KPI value carries the meaning), so it is aria-hidden. */
export function Sparkline({ data, className = "text-indigo-500", width = 96, height = 30 }: { data: number[]; className?: string; width?: number; height?: number }) {
  if (data.length < 2 || data.every((v) => v === 0)) {
    return (
      <svg viewBox={`0 0 ${width} ${height}`} className={`h-[30px] w-24 ${className}`} aria-hidden="true">
        <line x1="2" x2={width - 2} y1={height - 3} y2={height - 3} stroke="currentColor" strokeOpacity={0.25} strokeWidth={2} strokeLinecap="round" strokeDasharray="1 5" />
      </svg>
    );
  }
  const max = Math.max(...data), min = Math.min(...data);
  const span = max - min || 1;
  const pad = 3;
  const x = (i: number) => pad + (i * (width - pad * 2)) / (data.length - 1);
  const y = (v: number) => pad + (1 - (v - min) / span) * (height - pad * 2);
  const line = data.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const last = data.length - 1;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={`h-[30px] w-24 ${className}`} aria-hidden="true">
      <path d={`${line} L${x(last)},${height} L${x(0)},${height} Z`} fill="currentColor" opacity={0.1} />
      <path d={line} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(last)} cy={y(data[last])} r={2.5} fill="currentColor" className="stroke-white" strokeWidth={1.5} />
    </svg>
  );
}
