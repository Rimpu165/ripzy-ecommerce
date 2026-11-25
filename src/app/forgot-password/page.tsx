"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import AuthShell, { FormAlert, Spinner } from "@/components/account/AuthShell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setSent(true);
      else setError(data.error || "Something went wrong. Please try again.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      showPanel={false}
      title="Forgot your password?"
      subtitle={sent ? undefined : "Enter your email and we will send you a reset link."}
      footer={
        <Link href="/login" className="font-semibold text-indigo-600 hover:underline">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <div className="space-y-3 text-center" role="status">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <MailCheck className="h-6 w-6" aria-hidden="true" />
          </span>
          <p className="text-sm text-slate-600">
            If an account exists for <strong className="text-slate-900">{email}</strong>, a reset link is on its way. It expires in 30 minutes.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && <FormAlert>{error}</FormAlert>}
          <div>
            <label htmlFor="fp-email" className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
            <input id="fp-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" className="input" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading && <Spinner />}
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
