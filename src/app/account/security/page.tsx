import React from "react";
import SecurityForms from "@/components/account/SecurityForms";

export const metadata = { title: "Security | Ripzy" };

export default function SecurityPage() {
  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Security</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your password and active sessions.</p>
      </div>
      <SecurityForms />
    </div>
  );
}
