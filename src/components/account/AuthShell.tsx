"use client";

import React, { useState } from "react";
import { Eye, EyeOff, Check, Truck, ShieldCheck, RotateCcw } from "lucide-react";
import Logo from "@/components/ui/Logo";

const BENEFITS = [
  { icon: Truck, title: "Fast, tracked delivery", text: "Follow every order from checkout to your door." },
  { icon: RotateCcw, title: "Easy returns", text: "A simple return window on eligible orders." },
  { icon: ShieldCheck, title: "Secure checkout", text: "Your details and payments stay protected." },
];

/** Centred card with a flat benefit panel on large screens. */
export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
  showPanel = true,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  showPanel?: boolean;
}) {
  return (
    <div className="container-page flex min-h-[calc(100vh-10rem)] items-center justify-center py-10 sm:py-14">
      <div className={`grid w-full gap-6 ${showPanel ? "max-w-4xl lg:grid-cols-[1fr_340px]" : "max-w-md"}`}>
        <div className="card p-6 sm:p-8">
          <div className="mb-6 flex flex-col items-center text-center">
            <Logo />
            <h1 className="mt-5 text-2xl font-semibold text-slate-900">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>}
          </div>
          {children}
          {footer && <div className="mt-6 text-center text-sm text-slate-500">{footer}</div>}
        </div>
        {showPanel && (
          <aside
            className="hidden rounded-2xl border border-slate-200 bg-indigo-50/60 p-8 lg:flex lg:flex-col lg:justify-center"
            aria-label="Why shop with Ripzy"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-indigo-700">Why Ripzy</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">Shopping that feels effortless</h2>
            <ul className="mt-6 space-y-5">
              {BENEFITS.map((b) => (
                <li key={b.title} className="flex gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600">
                    <b.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{b.title}</p>
                    <p className="text-sm text-slate-600">{b.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>
    </div>
  );
}

export function FormAlert({ children }: { children: React.ReactNode }) {
  return (
    <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
      {children}
    </div>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  );
}

export function passwordChecks(pw: string) {
  return [
    { ok: pw.length >= 8, label: "8+ characters" },
    { ok: /[A-Za-z]/.test(pw), label: "A letter" },
    { ok: /\d/.test(pw), label: "A number" },
  ];
}

export function PasswordStrength({ value }: { value: string }) {
  const checks = passwordChecks(value);
  const score = value ? checks.filter((c) => c.ok).length + (value.length >= 12 && /[^A-Za-z0-9]/.test(value) ? 1 : 0) : 0;
  const bar = ["bg-slate-200", "bg-rose-300", "bg-amber-300", "bg-emerald-400", "bg-emerald-500"][score];
  const label = !value ? "" : score <= 1 ? "Weak" : score === 2 ? "Fair" : score === 3 ? "Good" : "Strong";
  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1" aria-hidden="true">
        {[1, 2, 3, 4].map((n) => (
          <span key={n} className={`h-1 flex-1 rounded-full ${n <= score ? bar : "bg-slate-200"}`} />
        ))}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
        {checks.map((c) => (
          <span key={c.label} className={`inline-flex items-center gap-1 ${c.ok ? "text-emerald-600" : "text-slate-500"}`}>
            <Check className={`h-3 w-3 ${c.ok ? "" : "opacity-30"}`} aria-hidden="true" />
            {c.label}
          </span>
        ))}
        {label && <span className="ml-auto font-medium text-slate-600">{label}</span>}
      </div>
    </div>
  );
}

/** Password input with show/hide toggle. */
export function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  error,
  placeholder,
  labelRight,
  hint,
  className = "",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  error?: string | null;
  placeholder?: string;
  labelRight?: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-slate-700">
          {label}
        </label>
        {labelRight}
      </div>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          required
          autoComplete={autoComplete}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
          className={`input pr-11 ${error ? "!border-rose-300" : ""}`}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && (
        <p id={`${id}-err`} className="mt-1 text-xs text-rose-600">
          {error}
        </p>
      )}
      {hint}
    </div>
  );
}
