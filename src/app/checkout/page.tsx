"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import {
  ShieldCheck,
  CheckCircle2,
  Check,
  CreditCard,
  Banknote,
  Truck,
  ArrowRight,
  ArrowLeft,
  Lock,
  RotateCcw,
  ChevronDown,
  MapPin,
  Plus,
  ShoppingBag,
  Mail,
  Package,
} from "lucide-react";
import { Spinner } from "@/components/account/AuthShell";

interface SavedAddress {
  id: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  isDefault: boolean;
}

interface AddressFields {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
}

const EMPTY_ADDR: AddressFields = { fullName: "", phone: "", addressLine1: "", addressLine2: "", city: "", state: "", postalCode: "" };
const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STEPS = [
  { num: 1, title: "Address" },
  { num: 2, title: "Delivery" },
  { num: 3, title: "Payment" },
  { num: 4, title: "Review" },
];

/** Adds N business days (Mon-Fri) to today. */
function addBusinessDays(n: number): Date {
  const d = new Date();
  let added = 0;
  while (added < n) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) added++;
  }
  return d;
}
const fmtDay = (d: Date) => d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

function Field({
  id,
  label,
  error,
  children,
  className = "",
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-err`} className="mt-1 text-xs text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}

function AddressForm({
  prefix,
  value,
  onChange,
  errors,
  showContact = true,
}: {
  prefix: string;
  value: AddressFields;
  onChange: (v: AddressFields) => void;
  errors: Partial<Record<keyof AddressFields, string>>;
  showContact?: boolean;
}) {
  const set = (k: keyof AddressFields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [k]: k === "postalCode" ? e.target.value.replace(/\D/g, "").slice(0, 6) : e.target.value });
  const cls = (k: keyof AddressFields) => `input ${errors[k] ? "!border-rose-300" : ""}`;
  const aria = (k: keyof AddressFields) => ({ "aria-invalid": !!errors[k], "aria-describedby": errors[k] ? `${prefix}-${k}-err` : undefined });
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {showContact && (
        <>
          <Field id={`${prefix}-fullName`} label="Full name" error={errors.fullName}>
            <input id={`${prefix}-fullName`} className={cls("fullName")} value={value.fullName} onChange={set("fullName")} autoComplete="name" placeholder="Rahul Sharma" {...aria("fullName")} />
          </Field>
          <Field id={`${prefix}-phone`} label="Phone number" error={errors.phone}>
            <input id={`${prefix}-phone`} type="tel" className={cls("phone")} value={value.phone} onChange={set("phone")} autoComplete="tel" placeholder="+91 98765 43210" {...aria("phone")} />
          </Field>
        </>
      )}
      <Field id={`${prefix}-line1`} label="Flat, house no., building" error={errors.addressLine1} className="sm:col-span-2">
        <input id={`${prefix}-line1`} className={cls("addressLine1")} value={value.addressLine1} onChange={set("addressLine1")} autoComplete="address-line1" {...aria("addressLine1")} />
      </Field>
      <Field id={`${prefix}-line2`} label="Area, street (optional)" className="sm:col-span-2">
        <input id={`${prefix}-line2`} className="input" value={value.addressLine2} onChange={set("addressLine2")} autoComplete="address-line2" />
      </Field>
      <Field id={`${prefix}-city`} label="City" error={errors.city}>
        <input id={`${prefix}-city`} className={cls("city")} value={value.city} onChange={set("city")} autoComplete="address-level2" {...aria("city")} />
      </Field>
      <Field id={`${prefix}-state`} label="State" error={errors.state}>
        <input id={`${prefix}-state`} className={cls("state")} value={value.state} onChange={set("state")} autoComplete="address-level1" {...aria("state")} />
      </Field>
      <Field id={`${prefix}-pin`} label="PIN code" error={errors.postalCode}>
        <input id={`${prefix}-pin`} inputMode="numeric" className={`${cls("postalCode")} font-mono`} value={value.postalCode} onChange={set("postalCode")} autoComplete="postal-code" placeholder="6 digits" {...aria("postalCode")} />
      </Field>
    </div>
  );
}

function validateAddress(a: AddressFields, requireContact = true) {
  const e: Partial<Record<keyof AddressFields, string>> = {};
  if (requireContact && a.fullName.trim().length < 2) e.fullName = "Enter the recipient's full name.";
  if (requireContact && a.phone.replace(/\D/g, "").length < 10) e.phone = "Enter a valid phone number.";
  if (!a.addressLine1.trim()) e.addressLine1 = "Enter the house or building details.";
  if (!a.city.trim()) e.city = "Enter a city.";
  if (!a.state.trim()) e.state = "Enter a state.";
  if (!/^\d{6}$/.test(a.postalCode.trim())) e.postalCode = "PIN code must be 6 digits.";
  return e;
}

function StepHeading({ n, title, hint }: { n: number; title: string; hint?: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-indigo-600">Step {n} of 4</p>
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {hint && <p className="mt-0.5 text-sm text-slate-500">{hint}</p>}
    </div>
  );
}

export default function CheckoutPage() {
  const { items, subtotal, discountTotal, taxTotal, shippingTotal, grandTotal, couponCode, refreshCart, config } = useCart();
  const { user } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [orderCompleted, setOrderCompleted] = useState<any | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const headingRef = useRef<HTMLDivElement>(null);

  // Contact + shipping
  const [email, setEmail] = useState(user?.email || "");
  const [ship, setShip] = useState<AddressFields>({ ...EMPTY_ADDR, fullName: user?.name || "", phone: user?.phone || "" });
  const [shipErrors, setShipErrors] = useState<Partial<Record<keyof AddressFields | "email", string>>>({});

  // Billing
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
  const [bill, setBill] = useState<AddressFields>({ ...EMPTY_ADDR });
  const [billErrors, setBillErrors] = useState<Partial<Record<keyof AddressFields, string>>>({});

  // Saved addresses (logged-in only)
  const [saved, setSaved] = useState<SavedAddress[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string>("new");

  const [paymentMethod, setPaymentMethod] = useState<"COD" | "RAZORPAY">("COD");
  // COD is hidden/blocked when disabled in settings or the order exceeds the COD cap (server enforces too)
  const codAllowed = config.codEnabled && grandTotal <= config.codMaxAmount;
  const effectivePayment: "COD" | "RAZORPAY" = paymentMethod === "COD" && !codAllowed ? "RAZORPAY" : paymentMethod;

  // Generate idempotency key for this checkout attempt
  const [idempotencyKey] = useState(() => "idemp_" + Math.random().toString(36).substring(2) + Date.now());

  // Keep contact fields in sync when the auth state resolves after first render.
  useEffect(() => {
    if (!user) return;
    setEmail((v) => v || user.email || "");
    setShip((s) => ({ ...s, fullName: s.fullName || user.name || "", phone: s.phone || user.phone || "" }));
  }, [user]);

  useEffect(() => {
    if (!user) {
      setSaved([]);
      return;
    }
    let cancelled = false;
    setSavedLoading(true);
    fetch("/api/account/addresses")
      .then((r) => (r.ok ? r.json() : { addresses: [] }))
      .then((d) => {
        if (cancelled) return;
        const list: SavedAddress[] = d.addresses || [];
        setSaved(list);
        const def = list.find((a) => a.isDefault) || list[0];
        if (def) applySaved(def);
      })
      .catch(() => {})
      .finally(() => !cancelled && setSavedLoading(false));
    return () => {
      cancelled = true;
    };
  }, [user]);

  const applySaved = (a: SavedAddress) => {
    setSelectedId(a.id);
    setShipErrors({});
    setShip({
      fullName: a.fullName,
      phone: a.phone,
      addressLine1: a.addressLine1,
      addressLine2: a.addressLine2 || "",
      city: a.city,
      state: a.state,
      postalCode: a.postalCode,
    });
  };

  const useNewAddress = () => {
    setSelectedId("new");
    setShipErrors({});
    setShip({ ...EMPTY_ADDR, fullName: user?.name || "", phone: user?.phone || "" });
  };

  const goTo = (s: 1 | 2 | 3 | 4) => {
    setStep(s);
    setError(null);
    requestAnimationFrame(() => headingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Partial<Record<keyof AddressFields | "email", string>> = validateAddress(ship);
    if (!user && !EMAIL_RE.test(email)) errs.email = "Enter an email for order confirmation.";
    const bErrs = billingSameAsShipping ? {} : validateAddress(bill);
    setShipErrors(errs);
    setBillErrors(bErrs);
    if (Object.keys(errs).length || Object.keys(bErrs).length) {
      setError("Please fix the highlighted fields to continue.");
      return;
    }
    goTo(2);
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
          shippingAddress: { ...ship },
          billingAddress: billingSameAsShipping ? null : { ...bill },
          paymentMethod: effectivePayment,
          guestEmail: email,
          guestPhone: ship.phone,
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
      if (effectivePayment === "RAZORPAY") {
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
        const verifyData = await verifyRes.json().catch(() => ({}));
        if (!verifyRes.ok) {
          setError(verifyData.error || "Payment could not be verified. Please try again.");
          setLoading(false);
          return;
        }
        data.order.status = "CONFIRMED";
      }

      await refreshCart();
      setOrderCompleted(data.order);
      window.scrollTo({ top: 0 });
    } catch {
      setError("An unexpected network error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const eta = useMemo(() => ({ from: addBusinessDays(2), to: addBusinessDays(3) }), []);

  /* ---------------- Success screen ---------------- */
  if (orderCompleted) {
    const paidOnline = effectivePayment === "RAZORPAY";
    return (
      <div className="container-page max-w-2xl py-12 sm:py-16">
        <div className="card p-6 text-center sm:p-10" role="status">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-9 w-9" aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-2xl font-semibold text-slate-900 sm:text-3xl">Thank you, your order is placed</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            We have received your order and will start preparing it right away.
          </p>

          <dl className="mx-auto mt-6 max-w-sm space-y-3 rounded-xl bg-slate-50 p-5 text-left text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Order number</dt>
              <dd className="font-mono font-semibold text-slate-900">{orderCompleted.orderNumber}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">{paidOnline ? "Amount paid" : "Amount due on delivery"}</dt>
              <dd className="font-semibold text-slate-900">{inr(orderCompleted.grandTotal)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Estimated delivery</dt>
              <dd className="text-right font-medium text-slate-900">
                {fmtDay(eta.from)} - {fmtDay(eta.to)}
              </dd>
            </div>
          </dl>

          <ol className="mx-auto mt-6 max-w-sm space-y-3 text-left text-sm text-slate-600">
            <li className="flex gap-3">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" aria-hidden="true" />
              <span>A confirmation is on its way to <strong className="text-slate-900">{email || user?.email || "your email"}</strong>.</span>
            </li>
            <li className="flex gap-3">
              <Package className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" aria-hidden="true" />
              <span>We will let you know as soon as your order ships.</span>
            </li>
            <li className="flex gap-3">
              <Truck className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" aria-hidden="true" />
              <span>Track progress anytime from your orders page.</span>
            </li>
          </ol>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            {user ? (
              <Link href={`/account/orders/${orderCompleted.id}`} className="btn-primary">
                View order
              </Link>
            ) : (
              <Link href="/register" className="btn-primary">
                Create an account to track it
              </Link>
            )}
            <Link href="/products" className="btn-secondary">
              Continue shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container-page max-w-md py-20 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <ShoppingBag className="h-7 w-7" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-xl font-semibold text-slate-900">Your cart is empty</h1>
        <p className="mt-1 text-sm text-slate-500">Add a few products to your cart before checking out.</p>
        <Link href="/products" className="btn-primary mt-5">
          Browse products
        </Link>
      </div>
    );
  }

  const summary = (
    <div className="space-y-4">
      <ul className="max-h-60 space-y-3 overflow-y-auto pr-1">
        {items.map((it) => (
          <li key={it.id} className="flex items-center gap-3 text-sm">
            <div className="relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.image} alt="" className="h-12 w-12 rounded-lg bg-slate-100 object-cover" />
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-700 px-1 text-[11px] font-medium text-white">
                {it.quantity}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-slate-900">{it.productName}</p>
              <p className="truncate text-xs text-slate-500">{it.variantTitle}</p>
            </div>
            <span className="shrink-0 font-medium text-slate-900">{inr(it.price * it.quantity)}</span>
          </li>
        ))}
      </ul>
      <dl className="space-y-2 border-t border-slate-100 pt-4 text-sm text-slate-600">
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd className="font-medium text-slate-900">{inr(subtotal)}</dd>
        </div>
        {discountTotal > 0 && (
          <div className="flex justify-between text-emerald-600">
            <dt>Discount{couponCode ? ` (${couponCode})` : ""}</dt>
            <dd>-{inr(discountTotal)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt>Estimated GST</dt>
          <dd>{inr(taxTotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Shipping</dt>
          <dd>{shippingTotal === 0 ? "Free" : inr(shippingTotal)}</dd>
        </div>
        <div className="flex justify-between border-t border-slate-100 pt-3 text-base font-semibold text-slate-900">
          <dt>Total</dt>
          <dd>{inr(grandTotal)}</dd>
        </div>
      </dl>
    </div>
  );

  const backBtn = "inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50";

  return (
    <div className="container-page py-6 sm:py-10">
      <div ref={headingRef} className="scroll-mt-24">
        <h1 className="mb-6 text-2xl font-semibold text-slate-900 sm:text-3xl">Checkout</h1>

        {/* Step indicator */}
        <nav aria-label="Checkout progress" className="mb-6 sm:mb-8">
          <ol className="flex items-center">
            {STEPS.map((st, i) => {
              const done = step > st.num;
              const current = step === st.num;
              return (
                <li key={st.num} className={`flex items-center ${i < STEPS.length - 1 ? "flex-1" : ""}`} aria-current={current ? "step" : undefined}>
                  <span className="flex items-center gap-2">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-medium ${
                        done
                          ? "border-indigo-600 bg-indigo-600 text-white"
                          : current
                            ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                            : "border-slate-300 bg-white text-slate-400"
                      }`}
                    >
                      {done ? <Check className="h-4 w-4" aria-hidden="true" /> : st.num}
                    </span>
                    <span className={`text-sm font-medium ${current ? "text-slate-900" : done ? "text-slate-700" : "text-slate-400"} ${current ? "" : "hidden sm:inline"}`}>
                      {st.title}
                      <span className="sr-only">{done ? " (completed)" : current ? " (current step)" : ""}</span>
                    </span>
                  </span>
                  {i < STEPS.length - 1 && <span aria-hidden="true" className={`mx-3 h-px flex-1 ${done ? "bg-indigo-500" : "bg-slate-200"}`} />}
                </li>
              );
            })}
          </ol>
        </nav>
      </div>

      {/* Mobile collapsible summary */}
      <div className="card mb-6 lg:hidden">
        <button
          type="button"
          onClick={() => setSummaryOpen((o) => !o)}
          aria-expanded={summaryOpen}
          aria-controls="mobile-summary"
          className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-indigo-700">
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            {summaryOpen ? "Hide" : "Show"} order summary ({items.length} item{items.length === 1 ? "" : "s"})
            <ChevronDown className={`h-4 w-4 transition-transform ${summaryOpen ? "rotate-180" : ""}`} aria-hidden="true" />
          </span>
          <span className="text-sm font-semibold text-slate-900">{inr(grandTotal)}</span>
        </button>
        {summaryOpen && (
          <div id="mobile-summary" className="border-t border-slate-100 p-4">
            {summary}
          </div>
        )}
      </div>

      {error && (
        <div role="alert" className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px] lg:gap-10">
        <div className="min-w-0">
          {/* Step 1: Address */}
          {step === 1 && (
            <form onSubmit={handleStep1Submit} noValidate className="card space-y-6 p-5 sm:p-7">
              <StepHeading n={1} title="Shipping address" hint="Where should we deliver your order?" />

              {user && (savedLoading || saved.length > 0) && (
                <fieldset>
                  <legend className="mb-2 text-sm font-medium text-slate-700">Saved addresses</legend>
                  {savedLoading ? (
                    <div className="h-20 animate-pulse rounded-xl bg-slate-100" aria-busy="true" />
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {saved.map((a) => {
                        const active = selectedId === a.id;
                        return (
                          <label
                            key={a.id}
                            className={`relative flex cursor-pointer gap-3 rounded-xl border p-4 text-sm transition-colors focus-within:ring-2 focus-within:ring-indigo-200 ${
                              active ? "border-indigo-500 bg-indigo-50/50" : "border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <input type="radio" name="saved-address" className="mt-1 accent-indigo-600" checked={active} onChange={() => applySaved(a)} />
                            <span className="min-w-0">
                              <span className="flex items-center gap-2 font-medium text-slate-900">
                                {a.fullName}
                                {a.isDefault && <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">Default</span>}
                              </span>
                              <span className="mt-0.5 block text-slate-600">
                                {a.addressLine1}
                                {a.addressLine2 ? `, ${a.addressLine2}` : ""}, {a.city}, {a.state} - {a.postalCode}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                      <label
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 text-sm transition-colors focus-within:ring-2 focus-within:ring-indigo-200 ${
                          selectedId === "new" ? "border-indigo-500 bg-indigo-50/50" : "border-dashed border-slate-300 hover:border-slate-400"
                        }`}
                      >
                        <input type="radio" name="saved-address" className="accent-indigo-600" checked={selectedId === "new"} onChange={useNewAddress} />
                        <span className="flex items-center gap-1.5 font-medium text-slate-800">
                          <Plus className="h-4 w-4" aria-hidden="true" /> Use a new address
                        </span>
                      </label>
                    </div>
                  )}
                </fieldset>
              )}

              {!user && (
                <Field id="co-email" label="Email for order confirmation" error={shipErrors.email}>
                  <input
                    id="co-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    aria-invalid={!!shipErrors.email}
                    aria-describedby={shipErrors.email ? "co-email-err" : undefined}
                    className={`input ${shipErrors.email ? "!border-rose-300" : ""}`}
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Have an account?{" "}
                    <Link href="/login?next=/checkout" className="font-medium text-indigo-600 hover:underline">
                      Sign in
                    </Link>{" "}
                    to use saved addresses.
                  </p>
                </Field>
              )}

              <AddressForm prefix="ship" value={ship} onChange={setShip} errors={shipErrors} />

              <div className="space-y-4">
                <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={billingSameAsShipping}
                    onChange={(e) => setBillingSameAsShipping(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-indigo-600"
                  />
                  Billing address is the same as shipping
                </label>
                {!billingSameAsShipping && (
                  <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                    <h3 className="text-sm font-semibold text-slate-900">Billing address</h3>
                    <AddressForm prefix="bill" value={bill} onChange={setBill} errors={billErrors} />
                  </div>
                )}
              </div>

              <div className="flex justify-end border-t border-slate-100 pt-5">
                <button type="submit" className="btn-primary w-full sm:w-auto">
                  Continue to delivery <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </form>
          )}

          {/* Step 2: Delivery */}
          {step === 2 && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                goTo(3);
              }}
              className="card space-y-6 p-5 sm:p-7"
            >
              <StepHeading n={2} title="Delivery" hint={`Delivering to ${ship.city}, ${ship.postalCode}`} />

              <div className="flex items-start justify-between gap-4 rounded-xl border border-indigo-500 bg-indigo-50/50 p-4">
                <div className="flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600">
                    <Truck className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-900">Standard delivery</p>
                    <p className="text-sm text-slate-600">
                      Arrives {fmtDay(eta.from)} - {fmtDay(eta.to)}
                    </p>
                    <p className="text-xs text-slate-500">2-3 business days</p>
                  </div>
                </div>
                <span className="shrink-0 text-sm font-semibold text-slate-900">{shippingTotal === 0 ? "Free" : inr(shippingTotal)}</span>
              </div>
              {shippingTotal > 0 && (
                <p className="text-xs text-slate-500">Free shipping on orders above {inr(config.freeShippingThreshold)}.</p>
              )}

              <div className="flex items-center justify-between border-t border-slate-100 pt-5">
                <button type="button" onClick={() => goTo(1)} className={backBtn}>
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
                </button>
                <button type="submit" className="btn-primary">
                  Continue to payment <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Payment */}
          {step === 3 && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                goTo(4);
              }}
              className="card space-y-6 p-5 sm:p-7"
            >
              <StepHeading n={3} title="Payment method" hint="You will not be charged until you place the order." />

              <fieldset className="space-y-3">
                <legend className="sr-only">Payment method</legend>
                {[
                  {
                    value: "RAZORPAY" as const,
                    title: "Pay online",
                    text: "UPI, cards, net banking and wallets via Razorpay",
                    icon: CreditCard,
                    tag: "Recommended",
                    show: true,
                  },
                  {
                    value: "COD" as const,
                    title: "Cash on delivery",
                    text: "Pay in cash when your order arrives",
                    icon: Banknote,
                    tag: "",
                    show: codAllowed,
                  },
                ]
                  .filter((o) => o.show)
                  .map((o) => {
                    const active = effectivePayment === o.value;
                    return (
                      <label
                        key={o.value}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors focus-within:ring-2 focus-within:ring-indigo-200 ${
                          active ? "border-indigo-500 bg-indigo-50/50" : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <input type="radio" name="payment" className="accent-indigo-600" checked={active} onChange={() => setPaymentMethod(o.value)} />
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                          <o.icon className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-slate-900">{o.title}</span>
                          <span className="block text-sm text-slate-500">{o.text}</span>
                        </span>
                        {o.tag && <span className="hidden shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 sm:inline">{o.tag}</span>}
                      </label>
                    );
                  })}
                {!codAllowed && (
                  <p className="text-sm text-slate-500">
                    {config.codEnabled
                      ? `Cash on delivery is available for orders up to ${inr(config.codMaxAmount)}.`
                      : "Cash on delivery is currently unavailable."}
                  </p>
                )}
              </fieldset>

              <ul className="grid gap-3 text-xs text-slate-600 sm:grid-cols-3">
                <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" /> Secure, encrypted payments</li>
                <li className="flex items-center gap-2"><RotateCcw className="h-4 w-4 text-emerald-600" aria-hidden="true" /> {config.returnWindowDays}-day easy returns</li>
                <li className="flex items-center gap-2"><Lock className="h-4 w-4 text-emerald-600" aria-hidden="true" /> Your data stays private</li>
              </ul>

              <div className="flex items-center justify-between border-t border-slate-100 pt-5">
                <button type="button" onClick={() => goTo(2)} className={backBtn}>
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
                </button>
                <button type="submit" className="btn-primary">
                  Review order <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </form>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="card space-y-6 p-5 sm:p-7">
              <StepHeading n={4} title="Review and place order" hint="Check the details below, then confirm." />

              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {[
                  {
                    label: "Ship to",
                    step: 1 as const,
                    icon: MapPin,
                    body: (
                      <>
                        <p className="font-medium text-slate-900">
                          {ship.fullName} · {ship.phone}
                        </p>
                        <p className="text-slate-600">
                          {ship.addressLine1}
                          {ship.addressLine2 ? `, ${ship.addressLine2}` : ""}, {ship.city}, {ship.state} - {ship.postalCode}
                        </p>
                        {!billingSameAsShipping && (
                          <p className="mt-1 text-xs text-slate-500">
                            Billing: {bill.addressLine1}, {bill.city}, {bill.state} - {bill.postalCode}
                          </p>
                        )}
                      </>
                    ),
                  },
                  {
                    label: "Delivery",
                    step: 2 as const,
                    icon: Truck,
                    body: (
                      <p className="text-slate-600">
                        Standard delivery · arrives {fmtDay(eta.from)} - {fmtDay(eta.to)} · {shippingTotal === 0 ? "Free" : inr(shippingTotal)}
                      </p>
                    ),
                  },
                  {
                    label: "Payment",
                    step: 3 as const,
                    icon: CreditCard,
                    body: <p className="text-slate-600">{effectivePayment === "COD" ? "Cash on delivery" : "Online payment via Razorpay"}</p>,
                  },
                ].map((row) => (
                  <div key={row.label} className="flex items-start gap-3 p-4 text-sm">
                    <row.icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="mb-0.5 text-xs font-medium text-slate-500">{row.label}</p>
                      {row.body}
                    </div>
                    <button type="button" onClick={() => goTo(row.step)} disabled={loading} className="text-sm font-medium text-indigo-600 hover:underline disabled:opacity-50">
                      Edit
                    </button>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-900">Items ({items.length})</h3>
                <ul className="divide-y divide-slate-100">
                  {items.map((it) => (
                    <li key={it.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                      <div className="flex min-w-0 items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={it.image} alt="" className="h-11 w-11 shrink-0 rounded-lg bg-slate-100 object-cover" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900">{it.productName}</p>
                          <p className="text-xs text-slate-500">
                            {it.variantTitle} × {it.quantity}
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 font-medium text-slate-900">{inr(it.price * it.quantity)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600">
                Stock is held for {config.stockReservationMinutes} minutes once you place the order. Clicking twice will not create a duplicate order.
              </p>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <button type="button" onClick={() => goTo(3)} disabled={loading} className={`${backBtn} justify-center`}>
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
                </button>
                <button type="button" onClick={handlePlaceOrder} disabled={loading} className="btn-primary px-6 py-3">
                  {loading ? (
                    <>
                      <Spinner /> Placing order...
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" aria-hidden="true" /> Place order · {inr(grandTotal)}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Desktop sticky summary */}
        <aside className="hidden lg:block" aria-label="Order summary">
          <div className="card sticky top-24 space-y-4 p-6">
            <h2 className="font-semibold text-slate-900">Order summary</h2>
            {summary}
            <div className="space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
              <p className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" /> Secure checkout, your details are encrypted
              </p>
              <p className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-emerald-600" aria-hidden="true" /> {config.returnWindowDays}-day returns on eligible items
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
