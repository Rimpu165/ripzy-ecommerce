"use client";

import React from "react";
import Link from "next/link";
import { Printer, ArrowLeft, Download, ShieldCheck } from "lucide-react";

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

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 py-10 px-4 sm:px-6">
      {/* Top action bar (hidden on print) */}
      <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center print:hidden">
        <Link
          href="/account/orders"
          className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Orders
        </Link>
        <button
          onClick={() => window.print()}
          className="px-5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center gap-2 transition-all"
        >
          <Printer className="w-4 h-4" /> Print / Save as PDF
        </button>
      </div>

      {/* Printable Invoice Sheet */}
      <div className="max-w-4xl mx-auto bg-white text-slate-900 rounded-3xl p-8 sm:p-12 shadow-xl border border-slate-200 print:border-none print:shadow-none print:p-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start pb-8 border-b border-slate-200 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-black text-base flex items-center justify-center">
                R
              </span>
              <span className="text-2xl font-black tracking-tight">Ripzy.</span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Ripzy Technologies Private Limited</p>
            <p className="text-xs text-slate-500">Unit 802, Horizon Cyber Park, Bandra Kurla Complex</p>
            <p className="text-xs text-slate-500">Mumbai, Maharashtra - 400051, India</p>
            <p className="text-xs text-slate-700 font-bold mt-1">GSTIN: 27AABCR1234F1Z9</p>
          </div>

          <div className="sm:text-right space-y-1">
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-black uppercase tracking-wider rounded-md inline-block">
              Tax Invoice / Bill of Supply
            </span>
            <p className="text-sm font-mono font-bold text-slate-900 mt-2">Invoice: {invoiceNumber}</p>
            <p className="text-xs text-slate-500">Order: {order.orderNumber}</p>
            <p className="text-xs text-slate-500">Date: {invoiceDate}</p>
          </div>
        </div>

        {/* Bill To / Ship To */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-6 border-b border-slate-200 text-xs">
          <div>
            <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1.5">
              Customer & Shipping Details
            </h4>
            <p className="text-sm font-extrabold text-slate-900">{shippingAddress.fullName || order.user?.name}</p>
            <p className="text-slate-600">{shippingAddress.addressLine1}</p>
            {shippingAddress.addressLine2 && <p className="text-slate-600">{shippingAddress.addressLine2}</p>}
            <p className="text-slate-600">
              {shippingAddress.city}, {shippingAddress.state} - {shippingAddress.postalCode}
            </p>
            <p className="text-slate-600 mt-1">Phone: {shippingAddress.phone || order.guestPhone}</p>
            <p className="text-slate-600">Email: {order.user?.email || order.guestEmail}</p>
          </div>

          <div className="sm:text-right space-y-1">
            <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1.5">
              Payment & Logistics
            </h4>
            <p className="text-slate-700">
              Payment Method:{" "}
              <strong className="text-slate-900 uppercase">
                {order.payments?.[0]?.paymentMethod || "COD"}
              </strong>
            </p>
            <p className="text-slate-700">
              Payment Status:{" "}
              <strong className="text-emerald-600 uppercase font-extrabold">{order.status}</strong>
            </p>
            {order.shipments?.[0] && (
              <p className="text-slate-700">
                AWB Tracking: <span className="font-mono">{order.shipments[0].trackingNumber}</span>
              </p>
            )}
          </div>
        </div>

        {/* Line Items Table with GST Breakdown */}
        <div className="py-6 border-b border-slate-200">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[10px] text-slate-400 uppercase font-black tracking-wider">
                <th className="pb-3">Description</th>
                <th className="pb-3">HSN</th>
                <th className="pb-3 text-center">Qty</th>
                <th className="pb-3 text-right">Unit Price</th>
                <th className="pb-3 text-right">Tax Rate</th>
                <th className="pb-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {order.items.map((item: any) => (
                <tr key={item.id} className="py-3">
                  <td className="py-3 font-bold text-slate-900">
                    {item.productName}
                    <span className="block text-[11px] font-normal text-slate-500">
                      Variant: {item.variantTitle} (SKU: {item.sku})
                    </span>
                  </td>
                  <td className="py-3 font-mono text-slate-500">85183000</td>
                  <td className="py-3 text-center font-bold">{item.quantity}</td>
                  <td className="py-3 text-right">₹{item.unitPrice.toLocaleString("en-IN")}</td>
                  <td className="py-3 text-right font-medium text-slate-500">{item.taxRate || 18}% GST</td>
                  <td className="py-3 text-right font-bold text-slate-900">
                    ₹{Math.round(item.totalPrice).toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Summary */}
        <div className="py-6 flex justify-end">
          <div className="w-full sm:w-72 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="font-bold text-slate-900">₹{order.subtotal.toLocaleString("en-IN")}</span>
            </div>
            {order.discountTotal > 0 && (
              <div className="flex justify-between text-emerald-600 font-bold">
                <span>Discount ({order.couponCode || "Coupon"})</span>
                <span>-₹{Math.round(order.discountTotal).toLocaleString("en-IN")}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>CGST (9%)</span>
              <span>₹{Math.round(order.taxTotal / 2).toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>SGST (9%)</span>
              <span>₹{Math.round(order.taxTotal / 2).toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Shipping Charge</span>
              <span>{order.shippingTotal === 0 ? "FREE" : `₹${order.shippingTotal}`}</span>
            </div>
            <div className="flex justify-between pt-3 border-t-2 border-slate-900 text-sm font-black text-slate-900">
              <span>Grand Total</span>
              <span className="text-base text-indigo-600">
                ₹{Math.round(order.grandTotal).toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>

        {/* Footer & Digital Stamp */}
        <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-400 gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>This is a computer generated invoice and requires no physical signature.</span>
          </div>
          <div className="text-right font-mono text-[11px]">
            Authorized Signatory: <strong>Ripzy India Ops</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
