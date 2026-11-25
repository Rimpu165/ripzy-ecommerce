"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { Badge, btnCls, btnGhostCls, fmtDate, inputCls, thCls, TableWrap } from "./ui";

export interface StaffRow {
  id: string;
  name: string;
  email: string;
  role: string;
  isBlocked: boolean;
  lastLoginAt: string | null;
}

const ROLES = ["STAFF", "MANAGER", "SUPER_ADMIN"];

async function call(url: string, method: string, body: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export default function StaffClient({ rows, meId }: { rows: StaffRow[]; meId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "STAFF", password: "" });

  async function run(fn: () => Promise<unknown>, okMsg: string) {
    setBusy(true);
    try {
      await fn();
      toast.success(okMsg);
      router.refresh();
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const done = await run(() => call("/api/admin/staff", "POST", form), "Staff account created.");
    if (done) setForm({ name: "", email: "", role: "STAFF", password: "" });
  }

  function resetPassword(id: string) {
    const password = prompt("New temporary password (min 10 chars, upper, lower, number, symbol):");
    if (!password) return;
    run(() => call(`/api/admin/staff/${id}`, "PATCH", { action: "reset_password", password }), "Password reset; sessions revoked.");
  }

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="grid gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
        <h2 className="text-sm font-extrabold text-slate-900 sm:col-span-2 lg:col-span-5">Create staff account</h2>
        <input required aria-label="Name" placeholder="Full name" className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input required type="email" aria-label="Email" placeholder="Email" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <select aria-label="Role" className={inputCls} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          {ROLES.map((r) => <option key={r}>{r}</option>)}
        </select>
        <input required type="text" autoComplete="off" aria-label="Temporary password" placeholder="Temporary password" className={inputCls} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <button disabled={busy} className={btnCls}>Create</button>
        <p className="text-[11px] text-slate-500 sm:col-span-2 lg:col-span-5">Min 10 characters with upper and lower case, a number and a symbol.</p>
      </form>

      <TableWrap>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50">
            <tr><th className={thCls}>Member</th><th className={thCls}>Role</th><th className={thCls}>Status</th><th className={thCls}>Last login</th><th className={`${thCls} text-right`}>Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => {
              const self = r.id === meId;
              return (
                <tr key={r.id}>
                  <td className="p-3"><p className="font-bold text-slate-900">{r.name}{self && " (you)"}</p><p className="text-slate-500">{r.email}</p></td>
                  <td className="p-3">
                    <select aria-label={`Role for ${r.name}`} disabled={busy || self} value={r.role} className={inputCls}
                      onChange={(e) => run(() => call(`/api/admin/staff/${r.id}`, "PATCH", { action: "change_role", role: e.target.value }), "Role updated.")}>
                      {ROLES.map((x) => <option key={x}>{x}</option>)}
                    </select>
                  </td>
                  <td className="p-3">{r.isBlocked ? <Badge tone="red">Deactivated</Badge> : <Badge tone="green">Active</Badge>}</td>
                  <td className="p-3 text-slate-500">{fmtDate(r.lastLoginAt)}</td>
                  <td className="space-x-2 whitespace-nowrap p-3 text-right">
                    <button disabled={busy} className={btnGhostCls} onClick={() => resetPassword(r.id)}>Reset password</button>
                    {r.isBlocked ? (
                      <button disabled={busy} className={btnGhostCls} onClick={() => run(() => call(`/api/admin/staff/${r.id}`, "PATCH", { action: "reactivate" }), "Reactivated.")}>Reactivate</button>
                    ) : (
                      <button disabled={busy || self} className={btnGhostCls} onClick={() => confirm(`Deactivate ${r.name}?`) && run(() => call(`/api/admin/staff/${r.id}`, "PATCH", { action: "deactivate" }), "Deactivated.")}>Deactivate</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableWrap>
    </div>
  );
}
