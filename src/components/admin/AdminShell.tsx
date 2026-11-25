"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, ShoppingBag, Undo2, Package, Layers, Ticket, Image as ImageIcon, FileText, Star,
  Users, ShieldCheck, BarChart3, Bell, ScrollText, Settings, Menu, X, LogOut, Store, Radio,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { LogoMark } from "@/components/ui/Logo";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, ShoppingBag, Undo2, Package, Layers, Ticket, Image: ImageIcon, FileText, Star,
  Users, ShieldCheck, BarChart3, Bell, ScrollText, Settings,
};

export interface ShellNavItem {
  href: string;
  label: string;
  icon: string;
}

interface Activity {
  type: string;
  title: string;
  message?: string;
  href?: string;
  at: string;
}

export default function AdminShell({
  nav,
  user,
  children,
}: {
  nav: ShellNavItem[];
  user: { name: string; role: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [live, setLive] = useState(false);
  const [feed, setFeed] = useState<Activity[]>([]);
  const [feedOpen, setFeedOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Realtime: SSE stream of store activity; refresh server data (debounced) when something happens.
  useEffect(() => {
    const es = new EventSource("/api/admin/stream");
    es.addEventListener("ready", () => setLive(true));
    es.addEventListener("activity", (ev) => {
      const a = JSON.parse((ev as MessageEvent).data) as Activity;
      setFeed((f) => [a, ...f].slice(0, 30));
      setUnread((n) => n + 1);
      toast.toast(`${a.title}${a.message ? ` — ${a.message}` : ""}`, "info");
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => router.refresh(), 800);
    });
    es.onerror = () => setLive(false);
    return () => {
      es.close();
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [router, toast]);

  useEffect(() => setOpen(false), [pathname]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  const sidebar = (
    <nav className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-5">
        <LogoMark size={34} />
        <div className="leading-none">
          <p className="font-display text-lg font-bold text-slate-900">Ripzy</p>
          <p className="mt-1 text-[11px] font-medium text-slate-500">Admin · {user.role.replace("_", " ").toLowerCase()}</p>
        </div>
      </div>
      <ul className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {nav.map((item) => {
          const Icon = ICONS[item.icon] ?? LayoutDashboard;
          const active = isActive(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? "text-indigo-600" : "text-slate-400"}`} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="space-y-1 border-t border-slate-100 p-3">
        <Link href="/" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900">
          <Store className="h-4 w-4" /> View storefront
        </Link>
        <button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#fbf8f7] text-slate-800">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white lg:block">{sidebar}</aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/30" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white shadow-pop">{sidebar}</aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
          <button className="rounded-lg p-2 lg:hidden" aria-label="Open menu" onClick={() => setOpen((o) => !o)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="hidden items-center gap-2 text-xs font-semibold lg:flex">
            <Radio className={`h-3.5 w-3.5 ${live ? "text-emerald-500" : "text-slate-400"}`} />
            <span className={live ? "text-emerald-600" : "text-slate-400"}>
              {live ? "Live — updates in real time" : "Reconnecting…"}
            </span>
          </div>
          <div className="relative flex items-center gap-2">
            <button
              aria-label="Activity"
              onClick={() => {
                setFeedOpen((o) => !o);
                setUnread(0);
              }}
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200"
            >
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-semibold text-white">
                  {unread}
                </span>
              )}
            </button>
            <span className="ml-1 hidden items-center gap-2 text-sm font-medium text-slate-700 sm:flex"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">{user.name.charAt(0).toUpperCase()}</span>{user.name}</span>
            {feedOpen && (
              <div className="absolute right-0 top-11 w-80 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                <p className="px-3 py-2 text-xs font-medium text-slate-500">Live activity</p>
                {feed.length === 0 && <p className="px-3 pb-3 text-sm text-slate-500">Waiting for activity…</p>}
                <ul className="max-h-80 overflow-y-auto">
                  {feed.map((a, i) => (
                    <li key={i}>
                      <Link
                        href={a.href || "#"}
                        onClick={() => setFeedOpen(false)}
                        className="block rounded-xl px-3 py-2 hover:bg-slate-100"
                      >
                        <p className="text-sm font-semibold">{a.title}</p>
                        {a.message && <p className="text-xs text-slate-500">{a.message}</p>}
                        <p className="text-[10px] text-slate-400">{new Date(a.at).toLocaleTimeString()}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </header>
        <div className="mx-auto w-full max-w-[1400px] p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}
