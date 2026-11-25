"use client";

import React from "react";
import { btnSecondary, btnDanger as btnDangerBase } from "@/components/admin/ui/tokens";
import { Modal as BaseModal } from "@/components/admin/ui/Modal";
import { Chip, type Tone } from "@/components/admin/ui/StatusBadge";
import { PageHeader } from "@/components/admin/ui/PageHeader";

export { inputCls, btnPrimary, btnDangerSolid } from "@/components/admin/ui/tokens";
export { Toggle } from "@/components/admin/ui/Form";

export const btnGhost = `${btnSecondary} !px-2.5 !py-1.5 !text-xs`;
export const btnDanger = `${btnDangerBase} !px-2.5 !py-1.5 !text-xs`;

export const cardCls = "card";

export function Field({
  label,
  hint,
  children,
  htmlFor,
  error,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  htmlFor?: string;
  error?: string | null;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-xs font-medium text-slate-700">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-rose-600">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-slate-500">{hint}</p>
      )}
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
  wide,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
  footer?: React.ReactNode;
}) {
  return (
    <BaseModal title={title} onClose={onClose} size={wide ? "lg" : "md"} footer={footer}>
      {children}
    </BaseModal>
  );
}

export function Badge({ tone, children }: { tone: "green" | "slate" | "amber" | "rose" | "indigo"; children: React.ReactNode }) {
  return <Chip tone={tone as Tone}>{children}</Chip>;
}

/** JSON fetch helper that never throws. */
export async function callApi<T = Record<string, unknown>>(url: string, method: string, body?: unknown): Promise<{ ok: boolean; data: T & { error?: string } }> {
  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  } catch {
    return { ok: false, data: { error: "Network error. Please try again." } as T & { error?: string } };
  }
}

/** ISO string -> value for <input type="datetime-local"> in the viewer's timezone. */
export function toLocalInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local value -> ISO string ("" -> null). */
export function fromLocalInput(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function fmtDate(iso?: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return <PageHeader title={title} description={subtitle} actions={action} />;
}
