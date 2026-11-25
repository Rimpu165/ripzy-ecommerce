"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, Truck, RotateCcw, Headphones, Mail, Phone, MapPin } from "lucide-react";
import Logo from "@/components/ui/Logo";
import { useStorefront } from "@/lib/use-storefront";

export default function Footer() {
  const { pages, categories, store } = useStorefront();

  const perks = [
    { icon: Truck, title: "Free delivery", text: `On orders above ₹${store.freeShippingThreshold.toLocaleString("en-IN")}` },
    { icon: RotateCcw, title: "Easy returns", text: `${store.returnWindowDays}-day hassle-free returns` },
    { icon: ShieldCheck, title: "Secure payments", text: "UPI, cards, netbanking & COD" },
    { icon: Headphones, title: "Friendly support", text: "We reply within one business day" },
  ];

  const link = "text-slate-600 transition hover:text-indigo-700";

  return (
    <footer className="mt-16 border-t border-slate-200 bg-white text-sm">
      <div className="border-b border-slate-100 bg-slate-50/70">
        <div className="container-page grid grid-cols-2 gap-5 py-7 lg:grid-cols-4">
          {perks.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-subtle ring-1 ring-slate-200">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-slate-800">{title}</p>
                <p className="mt-0.5 text-xs text-slate-500">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Logo size={38} showTagline />
          <p className="mt-4 max-w-sm leading-relaxed text-slate-500">
            Curated electronics and workspace essentials, delivered across India with transparent pricing, GST invoices and reliable after-sales support.
          </p>
          <ul className="mt-5 space-y-2.5 text-slate-600">
            {store.supportEmail && (
              <li className="flex items-center gap-2.5"><Mail className="h-4 w-4 text-slate-400" /><a className={link} href={`mailto:${store.supportEmail}`}>{store.supportEmail}</a></li>
            )}
            {store.supportPhone && (
              <li className="flex items-center gap-2.5"><Phone className="h-4 w-4 text-slate-400" /><a className={link} href={`tel:${store.supportPhone.replace(/\s/g, "")}`}>{store.supportPhone}</a></li>
            )}
            {store.address && (
              <li className="flex items-start gap-2.5"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><span>{store.address}</span></li>
            )}
          </ul>
        </div>

        <nav aria-label="Shop" className="lg:col-span-2">
          <h3 className="mb-4 font-semibold text-slate-900">Shop</h3>
          <ul className="space-y-2.5">
            <li><Link className={link} href="/products">All products</Link></li>
            {categories.map((c) => (
              <li key={c.id}><Link className={link} href={`/products?category=${c.slug}`}>{c.name}</Link></li>
            ))}
            <li><Link className={link} href="/products?sort=newest">New arrivals</Link></li>
          </ul>
        </nav>

        <nav aria-label="Account" className="lg:col-span-3">
          <h3 className="mb-4 font-semibold text-slate-900">My account</h3>
          <ul className="space-y-2.5">
            <li><Link className={link} href="/account/orders">Track &amp; manage orders</Link></li>
            <li><Link className={link} href="/wishlist">Wishlist</Link></li>
            <li><Link className={link} href="/account/addresses">Saved addresses</Link></li>
            <li><Link className={link} href="/account/profile">Profile &amp; security</Link></li>
            <li><Link className={link} href="/forgot-password">Forgot password</Link></li>
          </ul>
        </nav>

        <nav aria-label="Company" className="lg:col-span-3">
          <h3 className="mb-4 font-semibold text-slate-900">Company &amp; policies</h3>
          <ul className="space-y-2.5">
            {pages.length === 0 && <li className="text-slate-400">Coming soon</li>}
            {pages.map((p) => (
              <li key={p.slug}><Link className={link} href={`/pages/${p.slug}`}>{p.title}</Link></li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-slate-100">
        <div className="container-page flex flex-col items-center justify-between gap-3 py-5 text-xs text-slate-500 sm:flex-row">
          <p>© {new Date().getFullYear()} {store.name}. All rights reserved. Prices inclusive of applicable GST.</p>
          <ul className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
            {["UPI", "Visa", "Mastercard", "RuPay", "COD"].map((m) => (
              <li key={m} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1">{m}</li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
