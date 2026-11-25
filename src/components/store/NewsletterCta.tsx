"use client";

import React, { useState } from "react";
import { Mail, Check } from "lucide-react";

/** UI-only, non-persistent newsletter form. */
export default function NewsletterCta() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  return (
    <section aria-labelledby="newsletter-heading" className="container-page">
      <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-indigo-100 bg-indigo-50 p-6 sm:p-8 md:flex-row md:items-center">
        <div className="max-w-md">
          <h2 id="newsletter-heading" className="flex items-center gap-2 text-xl font-semibold text-slate-900">
            <Mail className="h-5 w-5 text-indigo-600" />
            Get deals in your inbox
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            New launches and offers, once a week. Use code <span className="font-semibold text-slate-900">RIPZY10</span> for 10% off your first order.
          </p>
        </div>
        {done ? (
          <p role="status" className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
            <Check className="h-4 w-4" /> Thanks, you are on the list.
          </p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (email.trim()) setDone(true);
            }}
            className="flex w-full gap-2 md:max-w-sm"
          >
            <label htmlFor="newsletter-email" className="sr-only">
              Email address
            </label>
            <input
              id="newsletter-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input min-w-0 flex-1"
            />
            <button type="submit" className="btn-primary shrink-0">
              Subscribe
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
