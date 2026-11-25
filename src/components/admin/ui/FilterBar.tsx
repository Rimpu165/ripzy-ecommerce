import React from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { btnPrimary, inputCls, selectCls } from "./tokens";

/**
 * Native GET form filter bar (works in server and client components).
 * Lays out as a responsive grid so controls never wrap awkwardly.
 */
export function FilterBar({
  children,
  clearHref,
  action,
  extra,
  onSubmit,
  formKey,
  applyLabel = "Apply filters",
}: {
  children: React.ReactNode;
  clearHref?: string;
  action?: string;
  extra?: React.ReactNode;
  onSubmit?: React.FormEventHandler<HTMLFormElement>;
  formKey?: string;
  applyLabel?: string;
}) {
  return (
    <form key={formKey} role="search" action={onSubmit ? undefined : action} onSubmit={onSubmit} className="card mb-4 p-3 sm:p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] lg:items-end">{children}</div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="submit" className={`${btnPrimary} !py-1.5`}>
          {applyLabel}
        </button>
        {clearHref && (
          <Link
            href={clearHref}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
          >
            <X className="h-3.5 w-3.5" /> Clear
          </Link>
        )}
        {extra && <div className="ml-auto flex flex-wrap items-center gap-2">{extra}</div>}
      </div>
    </form>
  );
}

export function FilterField({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}

export function SearchInput({
  name = "q",
  defaultValue,
  placeholder,
  label = "Search",
}: {
  name?: string;
  defaultValue?: string;
  placeholder?: string;
  label?: string;
}) {
  return (
    <FilterField label={label} className="sm:col-span-2">
      <span className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <input name={name} defaultValue={defaultValue} placeholder={placeholder} className={`${inputCls} pl-9`} />
      </span>
    </FilterField>
  );
}

export function FilterSelect({
  label,
  name,
  defaultValue,
  options,
  allLabel = "All",
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: Array<string | { value: string; label: string }>;
  allLabel?: string;
}) {
  return (
    <FilterField label={label}>
      <select name={name} defaultValue={defaultValue ?? ""} className={selectCls}>
        <option value="">{allLabel}</option>
        {options.map((o) => {
          const v = typeof o === "string" ? o : o.value;
          const l = typeof o === "string" ? o : o.label;
          return (
            <option key={v} value={v}>
              {l}
            </option>
          );
        })}
      </select>
    </FilterField>
  );
}

export function FilterInput({
  label,
  name,
  defaultValue,
  type = "text",
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <FilterField label={label}>
      <input name={name} type={type} defaultValue={defaultValue} placeholder={placeholder} className={inputCls} />
    </FilterField>
  );
}
