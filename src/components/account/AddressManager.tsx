"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Plus, Pencil, Trash2, Star } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { btnDanger, btnGhost, btnPrimary, cardCls, inputCls, labelCls } from "./styles";

export interface AddressDTO {
  id: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  isDefault: boolean;
}

const MAX = 10;
const EMPTY = { fullName: "", phone: "", addressLine1: "", addressLine2: "", city: "", state: "", postalCode: "", isDefault: false };

export default function AddressManager({ initial }: { initial: AddressDTO[] }) {
  const router = useRouter();
  const toast = useToast();
  const [list, setList] = useState(initial);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [busy, setBusy] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  const open = (a?: AddressDTO) => {
    setPinError(null);
    setForm(
      a
        ? { fullName: a.fullName, phone: a.phone, addressLine1: a.addressLine1, addressLine2: a.addressLine2 || "", city: a.city, state: a.state, postalCode: a.postalCode, isDefault: a.isDefault }
        : { ...EMPTY }
    );
    setEditing(a ? a.id : "new");
  };

  const reload = async () => {
    const res = await fetch("/api/account/addresses");
    if (res.ok) setList((await res.json()).addresses);
    router.refresh();
  };

  const call = async (url: string, method: string, body?: unknown) => {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Request failed.");
    return data;
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(form.postalCode)) return setPinError("PIN code must be exactly 6 digits.");
    setBusy(true);
    try {
      if (editing === "new") await call("/api/account/addresses", "POST", form);
      else await call(`/api/account/addresses/${editing}`, "PATCH", form);
      toast.success("Address saved.");
      setEditing(null);
      await reload();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this address?")) return;
    try {
      await call(`/api/account/addresses/${id}`, "DELETE");
      toast.success("Address deleted.");
      await reload();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const makeDefault = async (id: string) => {
    try {
      await call(`/api/account/addresses/${id}`, "PATCH", { isDefault: true });
      toast.success("Default address updated.");
      await reload();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: k === "postalCode" ? e.target.value.replace(/\D/g, "").slice(0, 6) : e.target.value }));

  return (
    <div className="space-y-5">
      {editing === null && (
        <button type="button" onClick={() => open()} disabled={list.length >= MAX} className={btnPrimary}>
          <Plus className="w-4 h-4" /> Add new address
        </button>
      )}
      {list.length >= MAX && editing === null && <p className="text-sm text-amber-700">You have reached the limit of {MAX} addresses.</p>}

      {editing !== null && (
        <form onSubmit={save} className={`${cardCls} p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4`}>
          <h2 className="sm:col-span-2 font-semibold text-slate-900">{editing === "new" ? "New address" : "Edit address"}</h2>
          <div>
            <label htmlFor="ad-name" className={labelCls}>Full name</label>
            <input id="ad-name" className={inputCls} value={form.fullName} onChange={set("fullName")} required autoComplete="name" />
          </div>
          <div>
            <label htmlFor="ad-phone" className={labelCls}>Phone</label>
            <input id="ad-phone" type="tel" className={inputCls} value={form.phone} onChange={set("phone")} required autoComplete="tel" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="ad-l1" className={labelCls}>Address line 1</label>
            <input id="ad-l1" className={inputCls} value={form.addressLine1} onChange={set("addressLine1")} required autoComplete="address-line1" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="ad-l2" className={labelCls}>Address line 2 (optional)</label>
            <input id="ad-l2" className={inputCls} value={form.addressLine2} onChange={set("addressLine2")} autoComplete="address-line2" />
          </div>
          <div>
            <label htmlFor="ad-city" className={labelCls}>City</label>
            <input id="ad-city" className={inputCls} value={form.city} onChange={set("city")} required autoComplete="address-level2" />
          </div>
          <div>
            <label htmlFor="ad-state" className={labelCls}>State</label>
            <input id="ad-state" className={inputCls} value={form.state} onChange={set("state")} required autoComplete="address-level1" />
          </div>
          <div>
            <label htmlFor="ad-pin" className={labelCls}>PIN code</label>
            <input id="ad-pin" inputMode="numeric" className={`${inputCls} font-mono`} value={form.postalCode} onChange={set("postalCode")} required placeholder="6 digits" aria-invalid={!!pinError} autoComplete="postal-code" />
            {pinError && <p className="text-xs text-rose-600 mt-1" role="alert">{pinError}</p>}
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 self-end pb-2">
            <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))} className="rounded" />
            Make this my default address
          </label>
          <div className="sm:col-span-2 flex gap-3">
            <button type="submit" disabled={busy} className={btnPrimary}>{busy ? "Saving..." : "Save address"}</button>
            <button type="button" onClick={() => setEditing(null)} className={btnGhost}>Cancel</button>
          </div>
        </form>
      )}

      {list.length === 0 && editing === null ? (
        <div className={`${cardCls} p-10 text-center`}>
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><MapPin className="h-6 w-6" aria-hidden="true" /></span>
          <p className="mt-3 text-sm font-medium text-slate-900">No saved addresses yet</p>
          <p className="text-sm text-slate-500">Add an address to check out faster.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {list.map((a) => (
            <li key={a.id} className={`${cardCls} p-5 space-y-2 text-sm flex flex-col`}>
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-slate-900">{a.fullName}</p>
                {a.isDefault && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">Default</span>
                )}
              </div>
              <p className="text-slate-600">
                {a.addressLine1}
                {a.addressLine2 ? `, ${a.addressLine2}` : ""}
                <br />
                {a.city}, {a.state} - {a.postalCode}
                <br />
                Phone: {a.phone}
              </p>
              <div className="flex flex-wrap gap-2 pt-3 mt-auto">
                <button type="button" onClick={() => open(a)} className={btnGhost}><Pencil className="w-3.5 h-3.5" /> Edit</button>
                {!a.isDefault && (
                  <button type="button" onClick={() => makeDefault(a.id)} className={btnGhost}><Star className="w-3.5 h-3.5" /> Set default</button>
                )}
                <button type="button" onClick={() => remove(a.id)} className={btnDanger}><Trash2 className="w-3.5 h-3.5" /> Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
