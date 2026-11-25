"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import AuthShell, { FormAlert, PasswordField, PasswordStrength, Spinner, passwordChecks } from "@/components/account/AuthShell";

function ResetForm() {
  const token = useSearchParams().get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mismatch = confirm.length > 0 && password !== confirm ? "Passwords do not match." : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!passwordChecks(password).every((c) => c.ok)) return setError("Password does not meet the requirements.");
    if (password !== confirm) return setError("Passwords do not match.");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setDone(true);
      else setError(data.error || "Could not reset password.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="space-y-3 text-center">
        <p className="text-sm text-slate-600">This reset link is missing its token.</p>
        <Link href="/forgot-password" className="btn-primary">
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="space-y-4 text-center" role="status">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" aria-hidden="true" />
        <p className="text-sm text-slate-600">Your password has been updated. All previous sessions were signed out.</p>
        <Link href="/login" className="btn-primary">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && (
        <FormAlert>
          {error}{" "}
          {error.includes("expired") && (
            <Link href="/forgot-password" className="font-semibold underline">
              Request a new link
            </Link>
          )}
        </FormAlert>
      )}
      <PasswordField id="rp-pass" label="New password" value={password} onChange={setPassword} autoComplete="new-password" hint={<PasswordStrength value={password} />} />
      <PasswordField id="rp-conf" label="Confirm password" value={confirm} onChange={setConfirm} autoComplete="new-password" error={mismatch} />
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading && <Spinner />}
        {loading ? "Updating..." : "Reset password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell
      showPanel={false}
      title="Set a new password"
      subtitle="Choose a strong password you have not used before."
      footer={
        <Link href="/login" className="font-semibold text-indigo-600 hover:underline">
          Back to sign in
        </Link>
      }
    >
      <Suspense fallback={null}>
        <ResetForm />
      </Suspense>
    </AuthShell>
  );
}
