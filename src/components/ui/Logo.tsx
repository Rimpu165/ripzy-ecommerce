import React from "react";
import Link from "next/link";

/** Ripzy mark: rounded tile with a stylised "R" whose leg sweeps into a shopping-bag handle. */
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect width="40" height="40" rx="11" fill="#bf4268" />
      <path d="M12 29V11h8.2c3.4 0 5.6 1.9 5.6 4.9 0 2.5-1.5 4.2-3.9 4.7L27.5 29" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="29" cy="12" r="2.4" fill="#fbe8ee" />
    </svg>
  );
}

export default function Logo({
  href = "/",
  tone = "dark",
  size = 36,
  showTagline = false,
}: {
  href?: string;
  tone?: "dark" | "light";
  size?: number;
  showTagline?: boolean;
}) {
  const text = tone === "light" ? "text-white" : "text-slate-900";
  const sub = tone === "light" ? "text-slate-400" : "text-slate-500";
  return (
    <Link href={href} className="flex items-center gap-2.5" aria-label="Ripzy home">
      <LogoMark size={size} />
      <span className="flex flex-col leading-none">
        <span className={`font-display text-xl font-bold tracking-tight ${text}`}>Ripzy</span>
        {showTagline && <span className={`mt-1 text-[10px] font-medium uppercase tracking-[0.18em] ${sub}`}>Shop smarter</span>}
      </span>
    </Link>
  );
}
