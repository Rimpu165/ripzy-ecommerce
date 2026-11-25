"use client";

import React, { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { btnDanger, btnPrimary, cardCls } from "./styles";
import { PasswordField, PasswordStrength, passwordChecks } from "./AuthShell";

export default function SecurityForms() {
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);

  const mismatch = confirm.length > 0 && next !== confirm ? "Passwords do not match." : null;

  const change = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordChecks(next).every((c) => c.ok)) return toast.error("New password does not meet the requirements.");
    if (next !== confirm) return toast.error("New passwords do not match.");
    setSaving(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json();
      if (!res.ok) toast.error(data.error || "Could not change password.");
      else {
        toast.success(data.message || "Password updated.");
        setCurrent("");
        setNext("");
        setConfirm("");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const signOutAll = async () => {
    setSigningOut(true);
    try {
      const res = await fetch("/api/account/sessions", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) toast.error(data.error || "Could not sign out devices.");
      else toast.success(data.message || "Signed out of other devices.");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSigningOut(false);
      setConfirmingSignOut(false);
    }
  };

  return (
    <>
      <form onSubmit={change} className={`${cardCls} space-y-4 p-5 sm:p-6`}>
        <div>
          <h2 className="font-semibold text-slate-900">Change password</h2>
          <p className="text-sm text-slate-500">Use a strong password you do not use elsewhere.</p>
        </div>
        <PasswordField id="sc-cur" label="Current password" value={current} onChange={setCurrent} autoComplete="current-password" />
        <PasswordField id="sc-new" label="New password" value={next} onChange={setNext} autoComplete="new-password" hint={<PasswordStrength value={next} />} />
        <PasswordField id="sc-conf" label="Confirm new password" value={confirm} onChange={setConfirm} autoComplete="new-password" error={mismatch} />
        <div className="flex justify-end border-t border-slate-100 pt-4">
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? "Updating..." : "Update password"}
          </button>
        </div>
      </form>

      <section className={`${cardCls} space-y-3 p-5 sm:p-6`}>
        <h2 className="font-semibold text-slate-900">Sign out of all devices</h2>
        <p className="text-sm text-slate-500">
          Lost a device or used a shared computer? End every other active session. You will stay signed in here.
        </p>
        {confirmingSignOut ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-rose-50 p-3" role="alert">
            <span className="text-sm text-rose-700">Sign out all other devices?</span>
            <button type="button" onClick={signOutAll} disabled={signingOut} className={btnDanger}>
              {signingOut ? "Signing out..." : "Yes, sign out"}
            </button>
            <button type="button" onClick={() => setConfirmingSignOut(false)} disabled={signingOut} className="text-sm font-medium text-slate-600 hover:underline">
              Cancel
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmingSignOut(true)} className={btnDanger}>
            Sign out other devices
          </button>
        )}
      </section>
    </>
  );
}
