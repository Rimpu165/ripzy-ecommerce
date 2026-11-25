"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import AuthShell, { FormAlert, PasswordField, Spinner } from "@/components/account/AuthShell";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailError = touched && email && !EMAIL_RE.test(email) ? "Enter a valid email address." : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setTouched(true);
    if (!EMAIL_RE.test(email)) return;
    setLoading(true);

    const res = await login(email, password);
    setLoading(false);

    if (res.success) {
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.href = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
    } else {
      setError(res.error || "We could not sign you in. Check your details and try again.");
    }
  };

  const showDemo = process.env.NODE_ENV !== "production";
  const demo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("Ripzy@1234");
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your Ripzy account"
      footer={
        <>
          New to Ripzy?{" "}
          <Link href="/register" className="font-semibold text-indigo-600 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      {error && <FormAlert>{error}</FormAlert>}
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="name@example.com"
            aria-invalid={!!emailError}
            aria-describedby={emailError ? "login-email-err" : undefined}
            className={`input ${emailError ? "!border-rose-300" : ""}`}
          />
          {emailError && (
            <p id="login-email-err" className="mt-1 text-xs text-rose-600">
              {emailError}
            </p>
          )}
        </div>

        <PasswordField
          id="login-password"
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          labelRight={
            <Link href="/forgot-password" className="text-xs font-medium text-indigo-600 hover:underline">
              Forgot password?
            </Link>
          }
        />

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading && <Spinner />}
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      {showDemo && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-medium text-slate-600">Demo accounts (dev only) - password Ripzy@1234</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {[
              ["Super admin", "admin@ripzy.com"],
              ["Manager", "manager@ripzy.com"],
              ["Staff", "staff@ripzy.com"],
              ["Customer", "customer@ripzy.com"],
            ].map(([label, em]) => (
              <button
                key={em}
                type="button"
                onClick={() => demo(em)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs font-medium text-slate-700 hover:border-indigo-300"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </AuthShell>
  );
}
