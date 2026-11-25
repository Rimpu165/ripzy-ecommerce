"use client";

import React, { useState } from "react";
import { Save } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { Field, PageTitle, Toggle, btnPrimary, btnGhost, callApi, inputCls } from "./ui";
import { SectionCard, StickySaveBar, InlineAlert } from "@/components/admin/ui/Form";

type Values = Record<string, string>;

interface FieldDef {
  key: string;
  label: string;
  kind: "text" | "email" | "number" | "boolean" | "textarea";
  hint?: string;
  min?: number;
  step?: number;
}

const GROUPS: { title: string; description: string; fields: FieldDef[] }[] = [
  {
    title: "Store info",
    description: "Shown on invoices, emails and the storefront footer.",
    fields: [
      { key: "store.name", label: "Store name", kind: "text" },
      { key: "store.supportEmail", label: "Support email", kind: "email" },
      { key: "store.supportPhone", label: "Support phone", kind: "text" },
      { key: "store.gstin", label: "GSTIN", kind: "text", hint: "15-character GST identification number" },
      { key: "store.address", label: "Registered address", kind: "textarea" },
    ],
  },
  {
    title: "Shipping",
    description: "Applied server-side to every cart and order (Rule 5).",
    fields: [
      { key: "shipping.freeThreshold", label: "Free shipping threshold (₹)", kind: "number", min: 0, hint: "Subtotal after discount at or above this ships free" },
      { key: "shipping.flatFee", label: "Flat shipping fee (₹)", kind: "number", min: 0 },
    ],
  },
  {
    title: "Orders & returns",
    description: "Reservation window, returns and Cash on Delivery rules.",
    fields: [
      { key: "order.returnWindowDays", label: "Return window (days)", kind: "number", min: 0, step: 1, hint: "From delivery date (Rule 7)" },
      { key: "order.stockReservationMinutes", label: "Stock reservation (minutes)", kind: "number", min: 1, step: 1, hint: "How long unpaid online orders hold stock (Rule 2)" },
      { key: "order.codEnabled", label: "Cash on Delivery enabled", kind: "boolean" },
      { key: "order.codMaxAmount", label: "COD maximum order amount (₹)", kind: "number", min: 0, hint: "Orders above this must pay online" },
    ],
  },
  {
    title: "Catalog",
    description: "Inventory alert defaults.",
    fields: [
      { key: "catalog.lowStockThreshold", label: "Low stock threshold (units)", kind: "number", min: 0, step: 1 },
    ],
  },
  {
    title: "Maintenance",
    description: "Pause new orders while you work on the store.",
    fields: [
      { key: "maintenance.enabled", label: "Maintenance mode (checkout disabled)", kind: "boolean", hint: "Checkout returns a friendly 503 message while enabled" },
    ],
  },
];

export default function SettingsClient({ initial }: { initial: Values }) {
  const toast = useToast();
  const [values, setValues] = useState<Values>(initial);
  const [saved, setSaved] = useState<Values>(initial);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const dirty = JSON.stringify(values) !== JSON.stringify(saved);
  const set = (k: string, v: string) => {
    setValues((s) => ({ ...s, [k]: v }));
    setFieldErrors((e) => {
      if (!e[k]) return e;
      const { [k]: _drop, ...rest } = e;
      void _drop;
      return rest;
    });
  };
  const reset = () => {
    setValues(saved);
    setFieldErrors({});
    setErrors(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body: Record<string, string | number | boolean> = {};
    const fe: Record<string, string> = {};
    for (const g of GROUPS) {
      for (const f of g.fields) {
        const raw = values[f.key] ?? "";
        if (f.kind === "number" && (raw.trim() === "" || !Number.isFinite(Number(raw)))) {
          fe[f.key] = "Enter a valid number";
          continue;
        }
        if (f.kind === "number" && f.min !== undefined && Number(raw) < f.min) {
          fe[f.key] = `Must be at least ${f.min}`;
          continue;
        }
        body[f.key] = f.kind === "boolean" ? raw === "true" : f.kind === "number" ? Number(raw) : raw;
      }
    }
    if (Object.keys(fe).length) {
      setFieldErrors(fe);
      setErrors("Please fix the highlighted fields before saving.");
      return;
    }
    setFieldErrors({});
    setSaving(true);
    setErrors(null);
    const res = await callApi<{ settings: Values }>("/api/admin/settings", "PUT", body);
    setSaving(false);
    if (!res.ok) {
      setErrors(res.data.error || "Could not save settings");
      return toast.error(res.data.error || "Could not save settings");
    }
    const next = { ...values, ...(res.data.settings ?? {}) };
    setValues(next);
    setSaved(next);
    toast.success("Settings saved");
  };

  return (
    <form onSubmit={submit} noValidate>
      <PageTitle title="Settings" subtitle="Changes apply to the storefront, cart and checkout immediately." />

      {errors && (
        <div className="mb-4">
          <InlineAlert>{errors}</InlineAlert>
        </div>
      )}

      <div className="space-y-6">
        {GROUPS.map((g) => (
          <SectionCard key={g.title} title={g.title} description={g.description}>
            <div className="grid gap-4 sm:grid-cols-2">
              {g.fields.map((f) => {
                const id = `s-${f.key}`;
                if (f.kind === "boolean") {
                  const on = values[f.key] === "true";
                  return (
                    <div key={f.key} className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50/50 p-3 sm:col-span-2">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{f.label}</p>
                        {f.hint && <p className="text-xs text-slate-500">{f.hint}</p>}
                      </div>
                      <Toggle checked={on} onChange={(v) => set(f.key, v ? "true" : "false")} label={f.label} />
                    </div>
                  );
                }
                const err = fieldErrors[f.key];
                return (
                  <div key={f.key} className={f.kind === "textarea" ? "sm:col-span-2" : ""}>
                    <Field label={f.label} htmlFor={id} hint={f.hint} error={err}>
                      {f.kind === "textarea" ? (
                        <textarea id={id} rows={2} className={inputCls} value={values[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} />
                      ) : (
                        <input
                          id={id}
                          type={f.kind === "number" ? "number" : f.kind}
                          min={f.min}
                          step={f.step ?? (f.kind === "number" ? "any" : undefined)}
                          aria-invalid={!!err}
                          className={`${inputCls} ${err ? "!border-rose-400 !ring-rose-500/10" : ""}`}
                          value={values[f.key] ?? ""}
                          onChange={(e) => set(f.key, e.target.value)}
                        />
                      )}
                    </Field>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        ))}
      </div>

      <StickySaveBar note={dirty ? "You have unsaved changes." : "All changes saved."}>
        <button type="button" className={btnGhost} disabled={saving || !dirty} onClick={reset}>
          Discard
        </button>
        <button type="submit" disabled={saving || !dirty} className={btnPrimary}>
          <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save changes"}
        </button>
      </StickySaveBar>
    </form>
  );
}
