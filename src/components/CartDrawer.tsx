"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { X, Trash2, Plus, Minus, ArrowRight, Tag, Check, Sparkles } from "lucide-react";

export default function CartDrawer() {
  const {
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

  const freeShippingThreshold = 999;
  const progressToFreeShipping = Math.min(100, (subtotal / freeShippingThreshold) * 100);
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);

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
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-slide-up">
          {/* Header */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Shopping Bag</h2>
              <span className="px-2 py-0.5 text-xs font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-full">
                {items.length} {items.length === 1 ? "item" : "items"}
              </span>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Shipping Bar */}
          <div className="bg-indigo-50/70 dark:bg-indigo-950/40 px-5 py-3 border-b border-indigo-100/50 dark:border-indigo-900/40">
            <div className="flex items-center justify-between text-xs font-medium text-indigo-900 dark:text-indigo-200 mb-1.5">
              <span>
                {remainingForFreeShipping > 0
                  ? `Add ₹${Math.round(remainingForFreeShipping)} more for FREE Delivery`
                  : "🎉 You unlocked FREE Delivery!"}
              </span>
              <span className="font-bold">{Math.round(progressToFreeShipping)}%</span>
            </div>
            <div className="w-full bg-indigo-200/60 dark:bg-indigo-900/60 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-indigo-600 dark:bg-indigo-400 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${progressToFreeShipping}%` }}
              />
            </div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-4">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">Your bag is empty</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                  Looks like you haven't added anything yet. Explore our latest electronics & workspace essentials!
                </p>
                <Link
                  href="/products"
                  onClick={() => setIsCartOpen(false)}
                  className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-all shadow-md shadow-indigo-600/20"
                >
                  Start Shopping
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"
                >
                  <img
                    src={item.image || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&q=80"}
                    alt={item.productName}
                    className="w-20 h-20 object-cover rounded-xl bg-white dark:bg-slate-900 flex-shrink-0"
                  />
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {item.productName}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{item.variantTitle}</p>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          ₹{item.price.toLocaleString("en-IN")}
                        </span>
                        {item.compareAtPrice && item.compareAtPrice > item.price && (
                          <span className="text-xs text-slate-400 line-through">
                            ₹{item.compareAtPrice.toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      {/* Quantity Controller */}
                      <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1 hover:text-indigo-600 text-slate-500"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2 text-xs font-semibold text-slate-900 dark:text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= item.stockAvailable || item.quantity >= 10}
                          className="p-1 hover:text-indigo-600 text-slate-500 disabled:opacity-30"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer & Checkout Summary */}
          {items.length > 0 && (
            <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
              {/* Coupon Form */}
              {couponCode ? (
                <div className="flex items-center justify-between p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold">
                    <Check className="w-4 h-4" />
                    <span>Coupon '{couponCode}' applied! (-₹{Math.round(discountTotal)})</span>
                  </div>
                  <button
                    onClick={removeCoupon}
                    className="text-rose-600 hover:underline font-bold text-[11px]"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="Try 'RIPZY10' or 'WELCOME500'"
                      className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 uppercase font-mono"
                    />
                    <Tag className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  </div>
                  <button
                    type="submit"
                    disabled={couponLoading || !couponInput.trim()}
                    className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {couponLoading ? "..." : "Apply"}
                  </button>
                </form>
              )}

              {couponMessage && (
                <p className={`text-xs ${couponMessage.error ? "text-rose-500" : "text-emerald-600"}`}>
                  {couponMessage.text}
                </p>
              )}

              {/* Price Breakdown */}
              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    ₹{subtotal.toLocaleString("en-IN")}
                  </span>
                </div>
                {discountTotal > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
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
                <div className="flex justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-sm font-bold text-slate-900 dark:text-white">
                  <span>Grand Total</span>
                  <span className="text-base text-indigo-600 dark:text-indigo-400">
                    ₹{Math.round(grandTotal).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Checkout CTA */}
              <Link
                href="/checkout"
                onClick={() => setIsCartOpen(false)}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 hover:scale-[1.01] active:scale-[0.99] transition-all"
              >
                Proceed to Checkout
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
