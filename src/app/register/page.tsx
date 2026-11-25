"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import AuthShell, { FormAlert, PasswordField, PasswordStrength, Spinner, passwordChecks } from "@/components/account/AuthShell";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const touch = (k: string) => () => setTouched((t) => ({ ...t, [k]: true }));
  const nameError = touched.name && name.trim().length < 2 ? "Please enter your full name." : null;
  const emailError = touched.email && !EMAIL_RE.test(email) ? "Enter a valid email address." : null;
  const pwValid = passwordChecks(password).every((c) => c.ok);
  const pwError = touched.password && !pwValid ? "Password does not meet the requirements." : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setTouched({ name: true, email: true, password: true });
    if (name.trim().length < 2 || !EMAIL_RE.test(email) || !pwValid) return;

    setLoading(true);
    const res = await register(name, email, password, phone);
    setLoading(false);

    if (res.success) {
      window.location.href = "/";
    } else {
      setError(res.error || "We could not create your account. Please try again.");
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Track orders, save addresses and check out faster"
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-indigo-600 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      {error && <FormAlert>{error}</FormAlert>}
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label htmlFor="reg-name" className="mb-1.5 block text-sm font-medium text-slate-700">Full name</label>
          <input id="reg-name" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} onBlur={touch("name")} placeholder="Rahul Sharma" aria-invalid={!!nameError} className={`input ${nameError ? "!border-rose-300" : ""}`} />
          {nameError && <p className="mt-1 text-xs text-rose-600">{nameError}</p>}
        </div>
        <div>
          <label htmlFor="reg-email" className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
          <input id="reg-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={touch("email")} placeholder="name@example.com" aria-invalid={!!emailError} className={`input ${emailError ? "!border-rose-300" : ""}`} />
          {emailError && <p className="mt-1 text-xs text-rose-600">{emailError}</p>}
        </div>
        <div>
          <label htmlFor="reg-phone" className="mb-1.5 block text-sm font-medium text-slate-700">
            Phone <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input id="reg-phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" className="input" />
        </div>
        <PasswordField
          id="reg-password"
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          error={pwError}
          hint={<PasswordStrength value={password} />}
        />
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading && <Spinner />}
          {loading ? "Creating account..." : "Create account"}
        </button>
        <p className="text-center text-xs text-slate-400">By creating an account you agree to our terms and privacy policy.</p>
      </form>
    </AuthShell>
  );
}
