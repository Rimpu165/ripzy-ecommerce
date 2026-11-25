"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package, MapPin, Heart, User, ShieldCheck, LayoutDashboard } from "lucide-react";

const TABS = [
  { href: "/account", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
  { href: "/account/profile", label: "Profile", icon: User },
  { href: "/account/security", label: "Security", icon: ShieldCheck },
];

export default function AccountNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Account sections"
      className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0 [scrollbar-width:none]"
    >
      {TABS.map((t) => {
        const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
        const Icon = t.icon;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 ${
              active
                ? "bg-indigo-50 text-indigo-700"
                : "text-slate-600 hover:bg-white hover:text-slate-900 max-lg:border max-lg:border-slate-200 max-lg:bg-white"
            } ${active ? "max-lg:border max-lg:border-indigo-200" : ""}`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
