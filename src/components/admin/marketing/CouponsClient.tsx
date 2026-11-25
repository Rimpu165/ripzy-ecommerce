"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Power } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { DataTable } from "@/components/admin/ui/DataTable";
import { ConfirmDialog } from "@/components/admin/ui/Modal";
import { thCls, tdCls } from "@/components/admin/ui/tokens";
import { EmptyState } from "@/components/admin/ui/EmptyState";
import { Ticket } from "lucide-react";
import {
  Badge, Field, Modal, PageTitle, btnDanger, btnGhost, btnPrimary, callApi, fmtDate, fromLocalInput, inputCls,
  toLocalInput, Toggle,
} from "./ui";

export interface CouponRow {
  id: string;
  code: string;
  description: string | null;
  discountType: string;
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount: number | null;
  startsAt: string;
  expiresAt: string | null;
  usageLimitTotal: number | null;
  usageLimitPerUser: number;
  usageCount: number;
  isActive: boolean;
  totalDiscount: number;
  uniqueCustomers: number;
}

export interface RecentUsage {
  id: string;
  code: string;
  orderNumber: string;
  customer: string;
  amount: number;
  usedAt: string;
}

interface FormState {
  id?: string;
  code: string;
  description: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: string;
  minOrderAmount: string;
  maxDiscountAmount: string;
  startsAt: string;
  expiresAt: string;
  usageLimitTotal: string;
  usageLimitPerUser: string;
  isActive: boolean;
}

const emptyForm = (): FormState => ({
  code: "",
  description: "",
  discountType: "PERCENTAGE",
  discountValue: "10",
  minOrderAmount: "0",
  maxDiscountAmount: "",
  startsAt: toLocalInput(new Date().toISOString()),
  expiresAt: "",
  usageLimitTotal: "",
  usageLimitPerUser: "1",
  isActive: true,
});

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

function status(c: CouponRow): { label: string; tone: "green" | "slate" | "amber" | "rose" } {
  const now = Date.now();
  if (!c.isActive) return { label: "Inactive", tone: "slate" };
  if (c.expiresAt && new Date(c.expiresAt).getTime() < now) return { label: "Expired", tone: "rose" };
  if (new Date(c.startsAt).getTime() > now) return { label: "Scheduled", tone: "amber" };
  if (c.usageLimitTotal && c.usageCount >= c.usageLimitTotal) return { label: "Exhausted", tone: "rose" };
  return { label: "Active", tone: "green" };
}

export default function CouponsClient({ coupons, recent }: { coupons: CouponRow[]; recent: RecentUsage[] }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<CouponRow | null>(null);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const openEdit = (c: CouponRow) =>
    setForm({
      id: c.id,
      code: c.code,
      description: c.description ?? "",
      discountType: c.discountType === "FIXED" ? "FIXED" : "PERCENTAGE",
      discountValue: String(c.discountValue),
      minOrderAmount: String(c.minOrderAmount),
      maxDiscountAmount: c.maxDiscountAmount != null ? String(c.maxDiscountAmount) : "",
      startsAt: toLocalInput(c.startsAt),
      expiresAt: toLocalInput(c.expiresAt),
      usageLimitTotal: c.usageLimitTotal != null ? String(c.usageLimitTotal) : "",
      usageLimitPerUser: String(c.usageLimitPerUser),
      isActive: c.isActive,
    });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const num = (s: string) => (s.trim() === "" ? null : Number(s));
    const body = {
      code: form.code,
      description: form.description || null,
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      minOrderAmount: Number(form.minOrderAmount || 0),
      maxDiscountAmount: form.discountType === "PERCENTAGE" ? num(form.maxDiscountAmount) : null,
      startsAt: fromLocalInput(form.startsAt) ?? new Date().toISOString(),
      expiresAt: fromLocalInput(form.expiresAt),
      usageLimitTotal: num(form.usageLimitTotal),
      usageLimitPerUser: Number(form.usageLimitPerUser || 1),
      isActive: form.isActive,
    };
    setSaving(true);
    const res = await callApi(form.id ? `/api/admin/coupons/${form.id}` : "/api/admin/coupons", form.id ? "PATCH" : "POST", body);
    setSaving(false);
    if (!res.ok) return toast.error(res.data.error || "Could not save coupon");
    toast.success(form.id ? "Coupon updated" : "Coupon created");
    setForm(null);
    router.refresh();
  };

  const toggleActive = async (c: CouponRow) => {
    setBusyId(c.id);
    const res = await callApi(`/api/admin/coupons/${c.id}`, "PATCH", { isActive: !c.isActive });
    setBusyId(null);
    if (!res.ok) return toast.error(res.data.error || "Failed");
    toast.success(c.isActive ? "Coupon deactivated" : "Coupon activated");
    router.refresh();
  };

  const remove = async (c: CouponRow) => {
    setBusyId(c.id);
    const res = await callApi(`/api/admin/coupons/${c.id}`, "DELETE");
    setBusyId(null);
    setToDelete(null);
    if (!res.ok) return toast.error(res.data.error || "Failed");
    toast.success("Coupon deleted");
    router.refresh();
  };

  return (
    <div>
      <PageTitle
        title="Coupons"
        subtitle="Create and manage discount codes. One coupon per order; limits are enforced at checkout."
        action={
          <button className={btnPrimary} onClick={() => setForm(emptyForm())}>
            <Plus className="h-4 w-4" /> New coupon
          </button>
        }
      />

      <DataTable minWidth={860} label="Coupons">
          <thead>
            <tr>
              <th className={`${thCls}`}>Code</th>
              <th className={`${thCls}`}>Discount</th>
              <th className={`${thCls}`}>Min order</th>
              <th className={`${thCls}`}>Validity</th>
              <th className={`${thCls}`}>Used</th>
              <th className={`${thCls}`}>Status</th>
              <th className={`${thCls} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {coupons.length === 0 && (
              <tr><td colSpan={7}><EmptyState icon={Ticket} title="No coupons yet" description="Create a discount code to run promotions." action={<button className={btnPrimary} onClick={() => setForm(emptyForm())}><Plus className="h-4 w-4" /> New coupon</button>} /></td></tr>
            )}
            {coupons.map((c) => {
              const st = status(c);
              return (
                <tr key={c.id}>
                  <td className={tdCls}>
                    <div className="font-mono font-bold text-slate-900">{c.code}</div>
                    {c.description && <div className="max-w-[220px] truncate text-[11px] text-slate-500">{c.description}</div>}
                  </td>
                  <td className={tdCls}>
                    {c.discountType === "PERCENTAGE" ? `${c.discountValue}%` : inr(c.discountValue)}
                    {c.discountType === "PERCENTAGE" && c.maxDiscountAmount ? (
                      <div className="text-[11px] text-slate-500">max {inr(c.maxDiscountAmount)}</div>
                    ) : null}
                  </td>
                  <td className={tdCls}>{c.minOrderAmount ? inr(c.minOrderAmount) : "-"}</td>
                  <td className={tdCls}>
                    <div>From {fmtDate(c.startsAt)}</div>
                    <div>To {c.expiresAt ? fmtDate(c.expiresAt) : "no expiry"}</div>
                  </td>
                  <td className={tdCls}>
                    {c.usageCount}
                    {c.usageLimitTotal ? ` / ${c.usageLimitTotal}` : ""}
                    <div className="text-[11px] text-slate-500">{c.usageLimitPerUser}/user</div>
                  </td>
                  <td className={tdCls}>
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </td>
                  <td className={tdCls}>
                    <div className="flex justify-end gap-2">
                      <button className={btnGhost} onClick={() => openEdit(c)} aria-label={`Edit ${c.code}`}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button className={btnGhost} disabled={busyId === c.id} onClick={() => toggleActive(c)}>
                        <Power className="h-3.5 w-3.5" /> {c.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        className={btnDanger}
                        disabled={busyId === c.id || c.usageCount > 0}
                        title={c.usageCount > 0 ? "Used coupons cannot be deleted - deactivate instead" : "Delete"}
                        onClick={() => setToDelete(c)}
                        aria-label={`Delete ${c.code}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
      </DataTable>

      {/* Usage stats */}
      <h2 className="mb-3 mt-10 text-base font-semibold text-slate-900">Usage statistics</h2>
      <div className="grid gap-6 lg:grid-cols-2">
        <DataTable minWidth={420}>
            <thead>
              <tr>
                <th className={thCls}>Code</th>
                <th className={thCls}>Redemptions</th>
                <th className={thCls}>Customers</th>
                <th className={thCls}>Discount given</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-mono font-bold text-slate-900">{c.code}</td>
                  <td className="px-4 py-3 text-slate-700">{c.usageCount}</td>
                  <td className="px-4 py-3 text-slate-700">{c.uniqueCustomers}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{inr(c.totalDiscount)}</td>
                </tr>
              ))}
              {coupons.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-500">No data</td>
                </tr>
              )}
            </tbody>
        </DataTable>
        <DataTable minWidth={420}>
            <thead>
              <tr>
                <th className={thCls}>Recent redemptions</th>
                <th className={thCls}>Order</th>
                <th className={thCls}>Saved</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    <span className="font-mono font-bold text-slate-900">{u.code}</span>
                    <div className="text-[11px] text-slate-500">{u.customer} · {fmtDate(u.usedAt)}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{u.orderNumber}</td>
                  <td className="px-4 py-3 font-semibold text-emerald-600">{inr(u.amount)}</td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-slate-500">No redemptions yet</td>
                </tr>
              )}
            </tbody>
        </DataTable>
      </div>

      <ConfirmDialog
        open={!!toDelete}
        danger
        title={`Delete coupon ${toDelete?.code ?? ""}?`}
        message="This cannot be undone. Coupons that have been redeemed cannot be deleted; deactivate them instead."
        confirmLabel="Delete"
        busy={!!toDelete && busyId === toDelete.id}
        onCancel={() => setToDelete(null)}
        onConfirm={() => toDelete && remove(toDelete)}
      />

      {form && (
        <Modal title={form.id ? `Edit coupon ${form.code}` : "New coupon"} onClose={() => setForm(null)}>
          <form onSubmit={save} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Code *" htmlFor="c-code" hint="Stored uppercase; letters, numbers, - and _">
                <input id="c-code" required className={`${inputCls} font-mono uppercase`} value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} maxLength={30} />
              </Field>
              <Field label="Type *" htmlFor="c-type">
                <select id="c-type" className={inputCls} value={form.discountType} onChange={(e) => set("discountType", e.target.value as FormState["discountType"])}>
                  <option value="PERCENTAGE">Percentage (%)</option>
                  <option value="FIXED">Fixed amount (₹)</option>
                </select>
              </Field>
              <Field label={form.discountType === "PERCENTAGE" ? "Percent off (1-100) *" : "Amount off (₹) *"} htmlFor="c-val">
                <input id="c-val" required type="number" step="any" min={form.discountType === "PERCENTAGE" ? 1 : 0.01} max={form.discountType === "PERCENTAGE" ? 100 : undefined} className={inputCls} value={form.discountValue} onChange={(e) => set("discountValue", e.target.value)} />
              </Field>
              <Field label="Minimum order (₹)" htmlFor="c-min">
                <input id="c-min" type="number" min={0} step="any" className={inputCls} value={form.minOrderAmount} onChange={(e) => set("minOrderAmount", e.target.value)} />
              </Field>
              {form.discountType === "PERCENTAGE" && (
                <Field label="Max discount (₹)" htmlFor="c-max" hint="Optional cap for percentage coupons">
                  <input id="c-max" type="number" min={1} step="any" className={inputCls} value={form.maxDiscountAmount} onChange={(e) => set("maxDiscountAmount", e.target.value)} />
                </Field>
              )}
              <Field label="Starts" htmlFor="c-start">
                <input id="c-start" type="datetime-local" className={inputCls} value={form.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
              </Field>
              <Field label="Expires" htmlFor="c-exp" hint="Leave empty for no expiry">
                <input id="c-exp" type="datetime-local" className={inputCls} value={form.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} />
              </Field>
              <Field label="Total usage limit" htmlFor="c-total" hint="Empty = unlimited">
                <input id="c-total" type="number" min={1} step={1} className={inputCls} value={form.usageLimitTotal} onChange={(e) => set("usageLimitTotal", e.target.value)} />
              </Field>
              <Field label="Per-user limit *" htmlFor="c-per">
                <input id="c-per" required type="number" min={1} step={1} className={inputCls} value={form.usageLimitPerUser} onChange={(e) => set("usageLimitPerUser", e.target.value)} />
              </Field>
            </div>
            <Field label="Description" htmlFor="c-desc">
              <input id="c-desc" className={inputCls} value={form.description} maxLength={200} onChange={(e) => set("description", e.target.value)} />
            </Field>
            <div className="flex items-center gap-3">
              <Toggle checked={form.isActive} onChange={(v) => set("isActive", v)} label="Active" />
              <span className="text-sm font-medium text-slate-700">{form.isActive ? "Active" : "Inactive"}</span>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className={btnGhost} onClick={() => setForm(null)}>Cancel</button>
              <button type="submit" disabled={saving} className={btnPrimary}>{saving ? "Saving..." : "Save coupon"}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
