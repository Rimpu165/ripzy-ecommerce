import React from "react";
import { AlertCircle } from "lucide-react";

/** Card with title/description header, used to group form fields. */
export function SectionCard({
  title,
  description,
  actions,
  children,
  className = "",
  padded = true,
}: {
  title?: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 px-5 py-4">
          <div>
            {title && <h2 className="text-sm font-semibold text-slate-900">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className={padded ? "p-5" : ""}>{children}</div>
    </section>
  );
}

export function FormField({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className = "",
}: {
  label: string;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: string | null;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1 block text-xs font-medium text-slate-700">
        {label}
        {required && (
          <span className="ml-0.5 text-rose-500" aria-hidden>
            *
          </span>
        )}
      </label>
      {children}
      {error ? (
        <p role="alert" className="mt-1 flex items-center gap-1 text-xs text-rose-600">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden /> {error}
        </p>
      ) : (
        hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>
      )}
    </div>
  );
}

/** Sticky bottom action bar for long forms. */
export function StickySaveBar({ children, note }: { children: React.ReactNode; note?: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 z-20 mt-6 rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-subtle backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 text-xs text-slate-500">{note}</div>
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      </div>
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:ring-offset-1 ${checked ? "bg-indigo-600" : "bg-slate-300"}`}
    >
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

export function InlineAlert({ tone = "rose", children }: { tone?: "rose" | "amber" | "emerald" | "sky"; children: React.ReactNode }) {
  const t = {
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    sky: "border-sky-200 bg-sky-50 text-sky-700",
  }[tone];
  return (
    <div role={tone === "rose" ? "alert" : "status"} className={`rounded-lg border px-3 py-2 text-sm ${t}`}>
      {children}
    </div>
  );
}
