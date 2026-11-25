import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function SectionHeader({
  title,
  eyebrow,
  href,
  linkLabel = "View all",
  id,
}: {
  title: string;
  eyebrow?: string;
  href?: string;
  linkLabel?: string;
  id?: string;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">{eyebrow}</p>}
        <h2 id={id} className="text-xl font-semibold text-slate-900 sm:text-2xl">
          {title}
        </h2>
      </div>
      {href && (
        <Link
          href={href}
          className="group inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
        >
          {linkLabel}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
