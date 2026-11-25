"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { X, Trash2, Plus, Minus, ArrowRight, Tag, Check, ShoppingBag, Truck } from "lucide-react";

export default function CartDrawer() {
  const {
    config,
    items,
    subtotal,
    discountTotal,
    taxTotal,
    shippingTotal,
    grandTotal,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeItem,
    couponCode,
    applyCoupon,
    removeCoupon,
  } = useCart();

  const [couponInput, setCouponInput] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponMessage, setCouponMessage] = useState<{ text: string; error?: boolean } | null>(null);

  if (!isCartOpen) return null;

  const freeShippingThreshold = Math.max(1, config.freeShippingThreshold);
  const netSubtotal = Math.max(0, subtotal - discountTotal); // threshold applies after discount (Rule 5)
  const progressToFreeShipping = Math.min(100, (netSubtotal / freeShippingThreshold) * 100);
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - netSubtotal);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    setCouponMessage(null);
    const res = await applyCoupon(couponInput.trim());
    setCouponLoading(false);
    if (res.success) {
      setCouponMessage({ text: res.message || "Coupon applied!" });
      setCouponInput("");
    } else {
      setCouponMessage({ text: res.error || "Failed to apply coupon", error: true });
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 transition-opacity" onClick={() => setIsCartOpen(false)} />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-8">
        <div className="animate-slide-up flex w-screen max-w-md flex-col border-l border-slate-200 bg-white shadow-pop">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-900">Shopping bag</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {items.length} {items.length === 1 ? "item" : "items"}
              </span>
            </div>
            <button
              aria-label="Close cart"
              onClick={() => setIsCartOpen(false)}
              className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Free shipping progress */}
          {items.length > 0 && (
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
              <div className="mb-1.5 flex items-center gap-2 text-xs text-slate-700">
                <Truck className="h-3.5 w-3.5 text-indigo-600" />
                <span>
                  {remainingForFreeShipping > 0 ? (
                    <>
                      Add <strong className="font-semibold">₹{Math.round(remainingForFreeShipping).toLocaleString("en-IN")}</strong> more for free delivery
                    </>
                  ) : (
                    "You have unlocked free delivery"
                  )}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-1.5 rounded-full bg-indigo-500 transition-all duration-500"
                  style={{ width: `${progressToFreeShipping}%` }}
                />
              </div>
            </div>
          )}

          {/* Items */}
          <div className="flex-1 overflow-y-auto px-5">
            {items.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <ShoppingBag className="h-8 w-8" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">Your bag is empty</h3>
                <p className="mt-1 max-w-xs text-sm text-slate-500">
                  Looks like you haven&apos;t added anything yet. Explore our latest electronics and workspace essentials.
                </p>
                <Link href="/products" onClick={() => setIsCartOpen(false)} className="btn-primary mt-6">
                  Start shopping
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.map((item) => (
                  <li key={item.id} className="flex gap-3 py-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.image || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&q=80"}
                      alt={item.productName}
                      className="h-20 w-20 shrink-0 rounded-xl border border-slate-100 bg-slate-50 object-cover"
                    />
                    <div className="flex min-w-0 flex-1 flex-col justify-between">
                      <div>
                        <h4 className="line-clamp-2 text-sm font-medium text-slate-900">{item.productName}</h4>
                        <p className="text-xs text-slate-500">{item.variantTitle}</p>
                        <div className="mt-1 flex items-baseline gap-2">
                          <span className="text-sm font-semibold text-slate-900">₹{item.price.toLocaleString("en-IN")}</span>
                          {item.compareAtPrice && item.compareAtPrice > item.price && (
                            <span className="text-xs text-slate-400 line-through">₹{item.compareAtPrice.toLocaleString("en-IN")}</span>
                          )}
                        </div>
                      </div>

                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center rounded-lg border border-slate-200 bg-white">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            aria-label={`Decrease quantity of ${item.productName}`}
                            className="p-1.5 text-slate-500 hover:text-indigo-600"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="min-w-6 px-1 text-center text-xs font-semibold text-slate-900">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            disabled={item.quantity >= item.stockAvailable || item.quantity >= 10}
                            aria-label={`Increase quantity of ${item.productName}`}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 disabled:opacity-30"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <button
                          onClick={() => removeItem(item.id)}
                          aria-label={`Remove ${item.productName}`}
                          className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Summary (sticky footer) */}
          {items.length > 0 && (
            <div className="space-y-4 border-t border-slate-200 bg-white px-5 py-4">
              {couponCode ? (
                <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs">
                  <div className="flex items-center gap-2 font-medium text-emerald-700">
                    <Check className="h-4 w-4" />
                    <span>Coupon &apos;{couponCode}&apos; applied (-₹{Math.round(discountTotal)})</span>
                  </div>
                  <button onClick={removeCoupon} className="text-[11px] font-semibold text-rose-600 hover:underline">
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <div className="relative flex-1">
                    <label htmlFor="cart-coupon" className="sr-only">Coupon code</label>
                    <input
                      id="cart-coupon"
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="Coupon code"
                      className="input py-2 pl-8 font-mono uppercase"
                    />
                    <Tag className="absolute left-2.5 top-3 h-3.5 w-3.5 text-slate-400" />
                  </div>
                  <button type="submit" disabled={couponLoading || !couponInput.trim()} className="btn-secondary">
                    {couponLoading ? "..." : "Apply"}
                  </button>
                </form>
              )}

              {couponMessage && (
                <p className={`text-xs ${couponMessage.error ? "text-rose-600" : "text-emerald-700"}`} role="status">
                  {couponMessage.text}
                </p>
              )}

              <div className="space-y-1.5 text-sm text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-medium text-slate-900">₹{subtotal.toLocaleString("en-IN")}</span>
                </div>
                {discountTotal > 0 && (
                  <div className="flex justify-between font-medium text-emerald-700">
                    <span>Discount</span>
                    <span>-₹{discountTotal.toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Estimated GST (18%)</span>
                  <span>₹{Math.round(taxTotal).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>{shippingTotal === 0 ? "FREE" : `₹${shippingTotal}`}</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-semibold text-slate-900">
                  <span>Total</span>
                  <span>₹{Math.round(grandTotal).toLocaleString("en-IN")}</span>
                </div>
              </div>

              <Link href="/checkout" onClick={() => setIsCartOpen(false)} className="btn-primary w-full py-3">
                Proceed to checkout
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
