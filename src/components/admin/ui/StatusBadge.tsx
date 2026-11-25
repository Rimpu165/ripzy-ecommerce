import React from "react";

export type Tone = "green" | "amber" | "sky" | "indigo" | "rose" | "slate" | "violet";

const TONES: Record<Tone, string> = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  amber: "bg-amber-50 text-amber-700 ring-amber-600/15",
  sky: "bg-sky-50 text-sky-700 ring-sky-600/15",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-600/15",
  rose: "bg-rose-50 text-rose-700 ring-rose-600/15",
  violet: "bg-violet-50 text-violet-700 ring-violet-600/15",
  slate: "bg-slate-100 text-slate-600 ring-slate-500/10",
};

const MAP: Record<string, Tone> = {
  // orders
  PENDING_PAYMENT: "amber",
  CONFIRMED: "sky",
  PROCESSING: "indigo",
  SHIPPED: "violet",
  DELIVERED: "green",
  CANCELLED: "rose",
  REFUNDED: "slate",
  // returns
  REQUESTED: "amber",
  APPROVED: "green",
  REJECTED: "rose",
  RECEIVED: "indigo",
  // payments / refunds / notifications
  INITIATED: "amber",
  PROCESSED: "green",
  FAILED: "rose",
  SUCCESS: "green",
  PAID: "green",
  PENDING: "amber",
  SENT: "green",
  // products / generic
  ACTIVE: "green",
  PUBLISHED: "green",
  DRAFT: "slate",
  ARCHIVED: "slate",
  INACTIVE: "slate",
  BLOCKED: "rose",
};

const label = (s: string) => {
  const t = s.replace(/_/g, " ").toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
};

export function Chip({ tone = "slate", children, dot }: { tone?: Tone; children: React.ReactNode; dot?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TONES[tone]}`}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden />}
      {children}
    </span>
  );
}

/** Maps order / payment / return / review / notification statuses to a soft tint chip. */
export function StatusBadge({ status, tone }: { status: string; tone?: Tone }) {
  return (
    <Chip tone={tone ?? MAP[status] ?? "slate"} dot>
      {label(status)}
    </Chip>
  );
}
