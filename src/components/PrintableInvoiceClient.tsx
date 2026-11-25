"use client";

import React from "react";
import Link from "next/link";
import { Printer, ArrowLeft, ShieldCheck } from "lucide-react";
import { LogoMark } from "@/components/ui/Logo";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function PrintableInvoiceClient({ order }: { order: any }) {
  let shippingAddress: any = {};
  try {
    shippingAddress = JSON.parse(order.shippingAddressJson);
  } catch {}

  const invoiceNumber = `INV-${order.orderNumber.replace("ORD-", "")}`;
  const invoiceDate = new Date(order.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

  return (
    <div className="min-h-screen bg-[#fbf8f7] px-4 py-8 sm:px-6 sm:py-10 print:min-h-0 print:bg-white print:p-0">
      <style>{`@media print { body > header, body > footer, body header, body footer, [role="dialog"] { display: none !important; } body, main { background: #fff !important; } * { box-shadow: none !important; -webkit-print-color-adjust: economy; } @page { margin: 14mm; } }`}</style>
      {/* Top action bar (hidden on print) */}
      <div className="mx-auto mb-5 flex max-w-4xl items-center justify-between print:hidden">
        <Link href="/account/orders" className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to orders
        </Link>
        <button type="button" onClick={() => window.print()} className="btn-primary">
          <Printer className="h-4 w-4" aria-hidden="true" /> Print / Save as PDF
        </button>
      </div>

      {/* Printable Invoice Sheet */}
      <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-subtle sm:p-10 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
        {/* Header */}
        <div className="flex flex-col items-start justify-between gap-6 border-b border-slate-200 pb-8 sm:flex-row">
          <div>
            <div className="mb-3 flex items-center gap-2.5">
              <LogoMark size={32} />
              <span className="font-display text-2xl font-bold tracking-tight">Ripzy</span>
            </div>
            <p className="text-sm font-medium text-slate-700">Ripzy Technologies Private Limited</p>
            <p className="text-xs text-slate-500">Unit 802, Horizon Cyber Park, Bandra Kurla Complex</p>
            <p className="text-xs text-slate-500">Mumbai, Maharashtra - 400051, India</p>
            <p className="mt-1 text-xs font-semibold text-slate-700">GSTIN: 27AABCR1234F1Z9</p>
          </div>

          <div className="space-y-1 sm:text-right">
            <p className="text-lg font-semibold text-slate-900">Tax Invoice</p>
            <p className="font-mono text-sm font-semibold text-slate-800">{invoiceNumber}</p>
            <p className="text-xs text-slate-500">Order: {order.orderNumber}</p>
            <p className="text-xs text-slate-500">Date: {invoiceDate}</p>
          </div>
        </div>

        {/* Bill To / Ship To */}
        <div className="grid grid-cols-1 gap-6 border-b border-slate-200 py-6 text-sm sm:grid-cols-2 sm:gap-8">
          <div>
            <h2 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">Customer &amp; shipping</h2>
            <p className="font-semibold text-slate-900">{shippingAddress.fullName || order.user?.name}</p>
            <p className="text-slate-600">{shippingAddress.addressLine1}</p>
            {shippingAddress.addressLine2 && <p className="text-slate-600">{shippingAddress.addressLine2}</p>}
            <p className="text-slate-600">
              {shippingAddress.city}, {shippingAddress.state} - {shippingAddress.postalCode}
            </p>
            <p className="mt-1 text-slate-600">Phone: {shippingAddress.phone || order.guestPhone}</p>
            <p className="text-slate-600">Email: {order.user?.email || order.guestEmail}</p>
          </div>

          <div className="space-y-1 sm:text-right">
            <h2 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">Payment &amp; logistics</h2>
            <p className="text-slate-700">
              Payment method: <strong className="text-slate-900">{order.payments?.[0]?.paymentMethod || "COD"}</strong>
            </p>
            <p className="text-slate-700">
              Order status: <strong className="text-slate-900">{String(order.status).replace(/_/g, " ")}</strong>
            </p>
            {order.shipments?.[0] && (
              <p className="text-slate-700">
                AWB tracking: <span className="font-mono">{order.shipments[0].trackingNumber}</span>
              </p>
            )}
          </div>
        </div>

        {/* Line items with GST breakdown */}
        <div className="overflow-x-auto border-b border-slate-200 py-6 print:overflow-visible">
          <table className="w-full min-w-[560px] text-left text-sm print:min-w-0">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="pb-3 font-medium">Description</th>
                <th className="pb-3 font-medium">HSN</th>
                <th className="pb-3 text-center font-medium">Qty</th>
                <th className="pb-3 text-right font-medium">Unit price</th>
                <th className="pb-3 text-right font-medium">Tax</th>
                <th className="pb-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {order.items.map((item: any) => (
                <tr key={item.id} className="break-inside-avoid">
                  <td className="py-3 font-medium text-slate-900">
                    {item.productName}
                    <span className="block text-xs font-normal text-slate-500">
                      {item.variantTitle} (SKU: {item.sku})
                    </span>
                  </td>
                  <td className="py-3 font-mono text-xs text-slate-500">85183000</td>
                  <td className="py-3 text-center">{item.quantity}</td>
                  <td className="py-3 text-right">{`₹${item.unitPrice.toLocaleString("en-IN")}`}</td>
                  <td className="py-3 text-right text-slate-500">{item.taxRate || 18}% GST</td>
                  <td className="py-3 text-right font-semibold text-slate-900">{inr(item.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end py-6 break-inside-avoid">
          <div className="w-full space-y-2 text-sm sm:w-72">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="font-medium text-slate-900">{`₹${order.subtotal.toLocaleString("en-IN")}`}</span>
            </div>
            {order.discountTotal > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Discount ({order.couponCode || "Coupon"})</span>
                <span>-{inr(order.discountTotal)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>CGST (9%)</span>
              <span>{inr(order.taxTotal / 2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>SGST (9%)</span>
              <span>{inr(order.taxTotal / 2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Shipping</span>
              <span>{order.shippingTotal === 0 ? "Free" : `₹${order.shippingTotal}`}</span>
            </div>
            <div className="flex justify-between border-t-2 border-slate-900 pt-3 text-base font-semibold text-slate-900">
              <span>Grand total</span>
              <span>{inr(order.grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col items-start justify-between gap-3 border-t border-slate-200 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-slate-400" aria-hidden="true" />
            <span>This is a computer generated invoice and requires no physical signature.</span>
          </div>
          <div className="font-mono text-[11px]">
            Authorized signatory: <strong>Ripzy India Ops</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
