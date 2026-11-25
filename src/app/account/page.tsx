import React from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Package, MapPin, Heart, ShieldCheck, ChevronRight, User, ShoppingBag } from "lucide-react";
import { cardCls, inr } from "@/components/account/styles";
import StatusChip from "@/components/account/StatusChip";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Account | Ripzy" };

export default async function AccountDashboard() {
  const user = (await getCurrentUser())!;
  const [orderCount, addressCount, wishlistCount, recent, defaultAddress] = await Promise.all([
    prisma.order.count({ where: { userId: user.id } }),
    prisma.address.count({ where: { userId: user.id } }),
    prisma.wishlist.count({ where: { userId: user.id } }),
    prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: { items: { select: { id: true } } },
    }),
    prisma.address.findFirst({
      where: { userId: user.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  const tiles = [
    { href: "/account/orders", label: "Orders", value: orderCount, icon: Package },
    { href: "/account/addresses", label: "Saved addresses", value: addressCount, icon: MapPin },
    { href: "/wishlist", label: "Wishlist items", value: wishlistCount, icon: Heart },
    { href: "/account/security", label: "Security", value: "Manage", icon: ShieldCheck },
  ];

  const quick = [
    { href: "/products", label: "Continue shopping", icon: ShoppingBag },
    { href: "/account/profile", label: "Edit profile", icon: User },
    { href: "/account/addresses", label: "Manage addresses", icon: MapPin },
    { href: "/account/security", label: "Change password", icon: ShieldCheck },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Hi, {user.name.split(" ")[0]}</h1>
        <p className="mt-1 text-sm text-slate-500">Here is a quick look at your orders and account.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <Link key={t.href} href={t.href} className={`${cardCls} p-4 transition hover:shadow-card sm:p-5`}>
              <Icon className="h-5 w-5 text-indigo-600" aria-hidden="true" />
              <p className="mt-3 text-2xl font-semibold text-slate-900">{t.value}</p>
              <p className="text-xs text-slate-500">{t.label}</p>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <section className={`${cardCls} p-5 sm:p-6`}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Recent orders</h2>
            <Link href="/account/orders" className="text-sm font-medium text-indigo-600 hover:underline">
              View all
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="py-8 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Package className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="mt-3 text-sm font-medium text-slate-900">No orders yet</p>
              <p className="text-sm text-slate-500">When you place an order it will show up here.</p>
              <Link href="/products" className="btn-primary mt-4">
                Start shopping
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.map((o) => (
                <li key={o.id}>
                  <Link href={`/account/orders/${o.id}`} className="group flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-semibold text-slate-900">{o.orderNumber}</p>
                      <p className="text-xs text-slate-500">
                        {o.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {o.items.length} item
                        {o.items.length === 1 ? "" : "s"} · {inr(o.grandTotal)}
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-2">
                      <StatusChip status={o.status} />
                      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-600" aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-6">
          <section className={`${cardCls} p-5 sm:p-6`}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Saved address</h2>
              <Link href="/account/addresses" className="text-sm font-medium text-indigo-600 hover:underline">
                {defaultAddress ? "Manage" : "Add"}
              </Link>
            </div>
            {defaultAddress ? (
              <div className="text-sm text-slate-600">
                <p className="font-medium text-slate-900">{defaultAddress.fullName}</p>
                <p>
                  {defaultAddress.addressLine1}
                  {defaultAddress.addressLine2 ? `, ${defaultAddress.addressLine2}` : ""}
                </p>
                <p>
                  {defaultAddress.city}, {defaultAddress.state} - {defaultAddress.postalCode}
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No saved address yet. Add one to speed up checkout.</p>
            )}
          </section>

          <section className={`${cardCls} p-5 sm:p-6`}>
            <h2 className="mb-2 font-semibold text-slate-900">Quick links</h2>
            <ul>
              {quick.map((q) => (
                <li key={q.label}>
                  <Link href={q.href} className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900">
                    <q.icon className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    {q.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
