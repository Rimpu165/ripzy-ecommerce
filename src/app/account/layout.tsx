import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AccountNav from "@/components/account/AccountNav";

export const dynamic = "force-dynamic";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");

  const initials = user.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <div className="container-page py-6 sm:py-10 print:max-w-none print:p-0">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr] lg:gap-8 print:block">
        <aside className="self-start print:hidden lg:sticky lg:top-24">
          <div className="mb-4 hidden items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 lg:flex">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-700" aria-hidden="true">
              {initials || "U"}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
            </div>
          </div>
          <AccountNav />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
