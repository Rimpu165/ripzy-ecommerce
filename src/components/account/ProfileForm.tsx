"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { btnPrimary, cardCls, inputCls, labelCls } from "./styles";

export default function ProfileForm(props: { name: string; email: string; phone: string }) {
  const { refreshUser } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(props.name);
  const [phone, setPhone] = useState(props.phone);
  const [saving, setSaving] = useState(false);
  const dirty = name !== props.name || phone !== props.phone;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      const data = await res.json();
      if (!res.ok) toast.error(data.error || "Could not update profile.");
      else {
        toast.success("Profile updated.");
        await refreshUser();
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className={`${cardCls} space-y-5 p-5 sm:p-6`}>
      <div>
        <h2 className="font-semibold text-slate-900">Personal details</h2>
        <p className="text-sm text-slate-500">Used for your orders and delivery updates.</p>
      </div>
      <div>
        <label htmlFor="pf-name" className={labelCls}>Full name</label>
        <input id="pf-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={80} autoComplete="name" />
      </div>
      <div>
        <label htmlFor="pf-email" className={labelCls}>Email</label>
        <input id="pf-email" className={inputCls} value={props.email} disabled readOnly aria-describedby="pf-email-hint" />
        <p id="pf-email-hint" className="mt-1 text-xs text-slate-500">Email cannot be changed.</p>
      </div>
      <div>
        <label htmlFor="pf-phone" className={labelCls}>Phone</label>
        <input id="pf-phone" type="tel" className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={15} autoComplete="tel" placeholder="+91 98765 43210" />
      </div>
      <div className="flex justify-end border-t border-slate-100 pt-4">
        <button type="submit" disabled={saving || !dirty} className={btnPrimary}>
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
    </form>
  );
}
