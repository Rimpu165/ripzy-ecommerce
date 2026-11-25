import React from "react";
import { Truck, ShieldCheck, RotateCcw, BadgeCheck } from "lucide-react";

export default function TrustStrip({ freeShippingThreshold = 999 }: { freeShippingThreshold?: number }) {
  const items = [
    { icon: Truck, title: "Free shipping", text: `On orders above ₹${freeShippingThreshold.toLocaleString("en-IN")}` },
    { icon: ShieldCheck, title: "Secure payments", text: "UPI, cards, netbanking & COD" },
    { icon: RotateCcw, title: "Easy returns", text: "Hassle-free returns" },
    { icon: BadgeCheck, title: "Brand warranty", text: "100% genuine products" },
  ];
  return (
    <div className="card grid grid-cols-2 divide-slate-100 lg:grid-cols-4 lg:divide-x">
      {items.map(({ icon: Icon, title, text }) => (
        <div key={title} className="flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            <p className="text-xs leading-snug text-slate-500">{text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
