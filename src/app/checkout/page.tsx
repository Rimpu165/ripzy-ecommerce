"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import {
  ShieldCheck,
  CheckCircle2,
  CreditCard,
  Banknote,
  Truck,
  ArrowRight,
  ArrowLeft,
  Lock,
  Sparkles,
} from "lucide-react";

export default function CheckoutPage() {
  const { items, subtotal, discountTotal, taxTotal, shippingTotal, grandTotal, couponCode, refreshCart } = useCart();
  const { user } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderCompleted, setOrderCompleted] = useState<any | null>(null);

  // Form State
  const [fullName, setFullName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("Mumbai");
  const [state, setState] = useState("Maharashtra");
  const [postalCode, setPostalCode] = useState("400050");
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "RAZORPAY">("COD");
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);

  // Generate idempotency key for this checkout attempt
  const [idempotencyKey] = useState(() => "idemp_" + Math.random().toString(36).substring(2) + Date.now());

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !addressLine1 || !postalCode) {
      setError("Please fill out all required address fields.");
      return;
    }
    if (!/^\d{6}$/.test(postalCode.trim())) {
      setError("Please enter a valid 6-digit postal PIN code.");
      return;
    }
    if (!user && !email) {
      setError("Please provide an email address for order confirmation.");
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(3);
  };

  const handleStep3Submit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(4);
  };

  const handlePlaceOrder = async () => {
    setLoading(true);
    setError(null);

    const guestSessionId = typeof window !== "undefined" ? localStorage.getItem("ripzy_guest_session") : null;

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shippingAddress: {
            fullName,
            phone,
            addressLine1,
            addressLine2,
            city,
            state,
            postalCode,
          },
          billingAddress: billingSameAsShipping
            ? null
            : {
                fullName,
                phone,
                addressLine1,
                addressLine2,
                city,
                state,
                postalCode,
              },
          paymentMethod,
          guestEmail: email,
          guestPhone: phone,
          guestSessionId,
          idempotencyKey,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to complete checkout.");
        setLoading(false);
        return;
      }

      // If Razorpay, trigger verification step
      if (paymentMethod === "RAZORPAY") {
        const verifyRes = await fetch("/api/checkout/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: data.order.id,
            pgOrderId: "rzp_order_" + data.order.id.slice(0, 8),
            pgPaymentId: "rzp_pay_" + Math.random().toString(36).substring(2),
            pgSignature: "mock_signature_verified",
          }),
        });
        const verifyData = await verifyRes.json();
        if (verifyRes.ok) {
          data.order.status = "CONFIRMED";
        }
      }

      await refreshCart();
      setOrderCompleted(data.order);
    } catch {
      setError("An unexpected network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  if (orderCompleted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-600/20 animate-bounce">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white">
          Order Placed Successfully!
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
          Thank you, <strong className="text-slate-900 dark:text-white">{fullName}</strong>. Your order{" "}
          <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded">
            {orderCompleted.orderNumber}
          </span>{" "}
          has been confirmed and is being prepared for dispatch.
        </p>

        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left space-y-4 max-w-md mx-auto shadow-sm">
          <div className="flex justify-between text-xs pb-3 border-b border-slate-100 dark:border-slate-800">
            <span className="text-slate-500">Order Number</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">{orderCompleted.orderNumber}</span>
          </div>
          <div className="flex justify-between text-xs pb-3 border-b border-slate-100 dark:border-slate-800">
            <span className="text-slate-500">Payment Status</span>
            <span className="font-bold text-emerald-600 uppercase">{orderCompleted.status}</span>
          </div>
          <div className="flex justify-between text-xs pb-3 border-b border-slate-100 dark:border-slate-800">
            <span className="text-slate-500">Total Amount Paid</span>
            <span className="font-bold text-slate-900 dark:text-white">₹{Math.round(orderCompleted.grandTotal).toLocaleString("en-IN")}</span>
          </div>
          <div className="text-[11px] text-slate-500">
            A confirmation receipt with tracking updates has been sent to{" "}
            <strong>{email || user?.email || "your email"}</strong>.
          </div>
        </div>

        <div className="pt-4 flex justify-center gap-4">
          <Link
            href="/account/orders"
            className="px-6 py-3 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs font-bold transition-all"
          >
            View Order History
          </Link>
          <Link
            href="/products"
            className="px-6 py-3 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Your cart is empty</h2>
        <p className="text-xs text-slate-500">Add products to your cart before proceeding to checkout.</p>
        <Link
          href="/products"
          className="inline-block px-5 py-2.5 rounded-full bg-indigo-600 text-white text-xs font-bold shadow-md"
        >
          Explore Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Checkout Progress Stepper (FR-CHK-01) */}
      <div className="max-w-2xl mx-auto mb-10">
        <div className="flex items-center justify-between">
          {[
            { num: 1, title: "Address" },
            { num: 2, title: "Delivery" },
            { num: 3, title: "Payment" },
            { num: 4, title: "Review" },
          ].map((st, i) => (
            <React.Fragment key={st.num}>
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                    step >= st.num
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                  }`}
                >
                  {step > st.num ? <CheckCircle2 className="w-5 h-5" /> : st.num}
                </div>
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  {st.title}
                </span>
              </div>
              {i < 3 && (
                <div
                  className={`flex-1 h-0.5 mx-2 transition-all ${
                    step > st.num ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-800"
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {error && (
        <div className="max-w-2xl mx-auto mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 text-xs font-medium text-center">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Main Wizard Form Area */}
        <div className="lg:col-span-2">
          {/* Step 1: Address */}
          {step === 1 && (
            <form onSubmit={handleStep1Submit} className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 animate-fade-in">
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Step 1: Shipping Address</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. rahul@example.com"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">6-digit PIN Code *</label>
                  <input
                    type="text"
                    required
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="e.g. 400050"
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Flat / House No. / Building *</label>
                <input
                  type="text"
                  required
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="e.g. Flat 402, High-Tech Residency"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">City *</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">State *</label>
                  <input
                    type="text"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={billingSameAsShipping}
                  onChange={(e) => setBillingSameAsShipping(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
                />
                <span>Billing address is same as shipping address</span>
              </label>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/30 flex items-center gap-2"
                >
                  Continue to Delivery <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* Step 2: Delivery */}
          {step === 2 && (
            <form onSubmit={handleStep2Submit} className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 animate-fade-in">
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Step 2: Delivery Speed
              </h2>

              <div className="p-4 rounded-2xl border-2 border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-600 text-white">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      Standard Express Delivery (2-3 Business Days)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Delivering to {city}, {postalCode}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                  {shippingTotal === 0 ? "FREE" : `₹${shippingTotal}`}
                </span>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Address
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/30 flex items-center gap-2"
                >
                  Continue to Payment <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Payment Method (FR-CHK-07) */}
          {step === 3 && (
            <form onSubmit={handleStep3Submit} className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 animate-fade-in">
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Step 3: Select Payment Method
              </h2>

              <div className="space-y-3">
                {/* Razorpay Online */}
                <label
                  onClick={() => setPaymentMethod("RAZORPAY")}
                  className={`p-4 rounded-2xl border-2 cursor-pointer flex items-center justify-between transition-all ${
                    paymentMethod === "RAZORPAY"
                      ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-indigo-600 text-white">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Razorpay Secure Checkout
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Pay via UPI, Cards, NetBanking, and Wallets
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 px-2.5 py-1 rounded-full">
                    Fast & Verified
                  </span>
                </label>

                {/* Cash on Delivery */}
                <label
                  onClick={() => setPaymentMethod("COD")}
                  className={`p-4 rounded-2xl border-2 cursor-pointer flex items-center justify-between transition-all ${
                    paymentMethod === "COD"
                      ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-600 text-white">
                      <Banknote className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Cash on Delivery (COD)
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Pay cash when the package reaches your doorstep
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500">
                    No upfront charge
                  </span>
                </label>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Delivery
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/30 flex items-center gap-2"
                >
                  Review Order <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* Step 4: Final Review & Place Order (Rule 1 & Rule 2 & FR-CHK-08) */}
          {step === 4 && (
            <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 animate-fade-in">
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Step 4: Review & Place Order
              </h2>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-3 text-xs">
                <div>
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                    Shipping Destination:
                  </span>
                  <p className="font-semibold text-slate-900 dark:text-white mt-0.5">
                    {fullName} • {phone}
                  </p>
                  <p className="text-slate-600 dark:text-slate-400">
                    {addressLine1}, {city}, {state} - {postalCode}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                    Payment Mode:
                  </span>
                  <p className="font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {paymentMethod === "COD" ? "Cash on Delivery" : "Razorpay Online Payment"}
                  </p>
                </div>
              </div>

              {/* Items Snapshot */}
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Order Items ({items.length}):
                </span>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {items.map((it) => (
                    <div key={it.id} className="flex justify-between items-center text-xs py-2 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <img src={it.image} alt={it.productName} className="w-10 h-10 object-cover rounded-lg bg-slate-100" />
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white truncate max-w-xs">{it.productName}</p>
                          <p className="text-[11px] text-slate-500">{it.variantTitle} × {it.quantity}</p>
                        </div>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">
                        ₹{(it.price * it.quantity).toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl text-[11px] text-amber-800 dark:text-amber-200">
                🔒 Stock will be reserved for 15 minutes once you click Place Order. Double submission is blocked by idempotency key.
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={loading}
                  className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Payment
                </button>
                <button
                  onClick={handlePlaceOrder}
                  disabled={loading}
                  className="px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm shadow-xl shadow-indigo-600/30 flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {loading ? (
                    "Processing Order..."
                  ) : (
                    <>
                      <Lock className="w-4 h-4" /> Confirm & Place Order (₹{Math.round(grandTotal).toLocaleString("en-IN")})
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Order Summary Card */}
        <div>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 sticky top-24">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Order Summary
            </h3>

            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex justify-between">
                <span>Subtotal ({items.length} items)</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  ₹{subtotal.toLocaleString("en-IN")}
                </span>
              </div>
              {discountTotal > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Discount ({couponCode})</span>
                  <span>-₹{Math.round(discountTotal).toLocaleString("en-IN")}</span>
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
              <div className="flex justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-base font-black text-slate-900 dark:text-white">
                <span>Total Amount</span>
                <span className="text-indigo-600 dark:text-indigo-400">
                  ₹{Math.round(grandTotal).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Safe & Secure 256-Bit SSL Checkout</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
