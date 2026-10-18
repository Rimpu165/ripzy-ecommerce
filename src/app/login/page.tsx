"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Lock, Mail, ArrowRight, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await login(email, password);
    setLoading(false);

    if (res.success) {
      window.location.href = "/";
    } else {
      setError(res.error || "Login failed.");
    }
  };

  const handleQuickDemoLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("Ripzy@1234");
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <span className="w-10 h-10 rounded-2xl bg-indigo-600 text-white font-black text-xl inline-flex items-center justify-center shadow-glow mb-1">
            R
          </span>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Welcome Back</h1>
          <p className="text-xs text-slate-500">Sign in to your Ripzy customer or staff account</p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 rounded-xl text-xs font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Email Address</label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500"
              />
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Password</label>
              <span className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
                Forgot?
              </span>
            </div>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Quick Logins */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs">
          <p className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            Quick Demo Accounts (Password: Ripzy@1234):
          </p>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => handleQuickDemoLogin("admin@ripzy.com")}
              className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 font-semibold text-left text-indigo-600 dark:text-indigo-400"
            >
              👑 Super Admin
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoLogin("manager@ripzy.com")}
              className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 font-semibold text-left text-slate-700 dark:text-slate-200"
            >
              💼 Manager
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoLogin("staff@ripzy.com")}
              className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 font-semibold text-left text-slate-700 dark:text-slate-200"
            >
              📦 Staff
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoLogin("customer@ripzy.com")}
              className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 font-semibold text-left text-slate-700 dark:text-slate-200"
            >
              🛍️ Customer
            </button>
          </div>
        </div>

        <div className="text-center text-xs text-slate-500">
          Don't have an account yet?{" "}
          <Link href="/register" className="font-bold text-indigo-600 hover:underline">
            Create an Account
          </Link>
        </div>
      </div>
    </div>
  );
}
