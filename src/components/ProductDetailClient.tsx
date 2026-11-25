"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/Toast";
import {
  Star,
  ShieldCheck,
  Truck,
  RotateCcw,
  Check,
  ShoppingBag,
  Zap,
  MapPin,
  Bell,
  Minus,
  Plus,
  ChevronRight,
} from "lucide-react";

interface Variant {
  id: string;
  sku: string;
  title: string;
  price: number;
  compareAtPrice?: number | null;
  stock: number;
  lowStockThreshold: number;
  attributes?: string | null;
}

interface Image {
  id: string;
  url: string;
  altText?: string | null;
  isPrimary: boolean;
}

interface ReviewItem {
  id: string;
  rating: number;
  title?: string | null;
  comment: string;
  isVerifiedBuyer: boolean;
  author: string;
  createdAt: string;
}

interface ProductDetailProps {
  product: {
    id: string;
    name: string;
    slug: string;
    description: string;
    shortDescription?: string | null;
    taxRate: number;
    brand?: { name: string } | null;
    category?: { name: string; slug?: string } | null;
    variants: Variant[];
    images: Image[];
    reviews?: ReviewItem[];
    ratingSummary?: {
      average: number;
      count: number;
      distribution: { star: number; count: number }[];
    };
  };
}

export default function ProductDetailClient({ product }: ProductDetailProps) {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const toast = useToast();
  const [alertEmail, setAlertEmail] = useState("");
  const [alertBusy, setAlertBusy] = useState(false);
  const [alertDone, setAlertDone] = useState<Record<string, boolean>>({});
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [pincode, setPincode] = useState("");
  const [pincodeStatus, setPincodeStatus] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [activeTab, setActiveTab] = useState<"description" | "specifications" | "reviews">("description");

  const activeVariant = product.variants[selectedVariantIndex] || product.variants[0];
  const images = product.images.length > 0 ? product.images : [{ id: "def", url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80", altText: product.name, isPrimary: true }];
  const currentImage = images[activeImageIndex] || images[0];

  const discountPercent =
    activeVariant.compareAtPrice && activeVariant.compareAtPrice > activeVariant.price
      ? Math.round(
          ((activeVariant.compareAtPrice - activeVariant.price) /
            activeVariant.compareAtPrice) *
            100
        )
      : 0;

  const handleAddToCart = async () => {
    if (activeVariant.stock <= 0 || adding) return;
    setAdding(true);
    await addToCart(activeVariant.id, quantity);
    setAdding(false);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const submitAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = (user?.email || alertEmail).trim();
    if (!email) return;
    setAlertBusy(true);
    try {
      const res = await fetch("/api/stock-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId: activeVariant.id, email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) toast.error(data.error || "Could not save your alert.");
      else {
        setAlertDone((d) => ({ ...d, [activeVariant.id]: true }));
        toast.success(data.message || "We will let you know!");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setAlertBusy(false);
    }
  };

  const summary = product.ratingSummary;

  const handleCheckPincode = (e: React.FormEvent) => {
    e.preventDefault();
    if (/^\d{6}$/.test(pincode.trim())) {
      setPincodeStatus("Delivery available in 2-3 business days! Free shipping above ₹999.");
    } else {
      setPincodeStatus("Please enter a valid 6-digit postal PIN code.");
    }
  };


  // Specifications: derived from variant attributes (JSON) + basics
  const parseAttrs = (raw?: string | null): Record<string, string> => {
    if (!raw) return {};
    try {
      const o = JSON.parse(raw);
      if (o && typeof o === "object" && !Array.isArray(o)) {
        return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, String(v)]));
      }
    } catch {
      /* ignore malformed attributes */
    }
    return {};
  };
  const specs: [string, string][] = [];
  if (product.brand) specs.push(["Brand", product.brand.name]);
  if (product.category) specs.push(["Category", product.category.name]);
  const attrKeys = Array.from(new Set(product.variants.flatMap((v) => Object.keys(parseAttrs(v.attributes)))));
  for (const k of attrKeys) {
    const values = Array.from(new Set(product.variants.map((v) => parseAttrs(v.attributes)[k]).filter(Boolean)));
    specs.push([k.charAt(0).toUpperCase() + k.slice(1), values.join(", ")]);
  }
  specs.push(["Model / SKU", activeVariant.sku]);
  specs.push(["GST", `${product.taxRate}% included`]);

  const highlights = (product.shortDescription || "")
    .split(/\n+|(?<=\.)\s+/)
    .map((t) => t.replace(/^[-*•\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, 5);

  const tabs = [
    { id: "description", label: "Description" },
    { id: "specifications", label: "Specifications" },
    { id: "reviews", label: `Reviews${summary && summary.count ? ` (${summary.count})` : ""}` },
  ] as const;

  const trust = [
    { icon: Truck, text: "Free delivery above ₹999" },
    { icon: RotateCcw, text: "Easy returns" },
    { icon: ShieldCheck, text: "Genuine product & warranty" },
  ];

  const lowStock = activeVariant.stock > 0 && activeVariant.stock <= 5;

  return (
    <div className="container-page py-6 sm:py-8">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-5 text-xs text-slate-500">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link href="/" className="hover:text-indigo-600">Home</Link></li>
          <li aria-hidden="true"><ChevronRight className="h-3 w-3" /></li>
          <li><Link href="/products" className="hover:text-indigo-600">Products</Link></li>
          {product.category && (
            <>
              <li aria-hidden="true"><ChevronRight className="h-3 w-3" /></li>
              <li>
                <Link href={`/products?category=${product.category.slug ?? ""}`} className="hover:text-indigo-600">
                  {product.category.name}
                </Link>
              </li>
            </>
          )}
          <li aria-hidden="true"><ChevronRight className="h-3 w-3" /></li>
          <li aria-current="page" className="max-w-[220px] truncate text-slate-800">{product.name}</li>
        </ol>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] lg:gap-12">
        {/* Gallery (FR-PDP-01) */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:gap-4">
          {images.length > 1 && (
            <div className="flex gap-2.5 overflow-x-auto sm:max-h-[560px] sm:flex-col sm:overflow-y-auto sm:overflow-x-hidden" role="list" aria-label="Product images">
              {images.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImageIndex(idx)}
                  aria-label={`Show image ${idx + 1}`}
                  aria-current={activeImageIndex === idx ? "true" : undefined}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border bg-white transition sm:h-20 sm:w-20 ${
                    activeImageIndex === idx ? "border-indigo-500 ring-2 ring-indigo-100" : "border-slate-200 opacity-80 hover:opacity-100"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="thumbnail" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
          <div className="relative aspect-square w-full flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentImage.url}
              alt={currentImage.altText || product.name}
              className="h-full w-full object-contain object-center"
            />
            {discountPercent > 0 && (
              <span className="absolute left-3 top-3 rounded-md bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                {discountPercent}% off
              </span>
            )}
          </div>
        </div>

        {/* Buy box (FR-PDP-02 & FR-PDP-03) */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="card space-y-5 p-5 sm:p-6">
            <div>
              {product.brand && <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{product.brand.name}</p>}
              <h1 className="mt-1 text-xl font-semibold text-slate-900 sm:text-2xl">{product.name}</h1>

              <div className="mt-2 flex items-center gap-2">
                {summary && summary.count > 0 ? (
                  <>
                    <span className="inline-flex items-center gap-0.5 rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-semibold text-emerald-700">
                      {summary.average.toFixed(1)}
                      <Star className="h-3 w-3 fill-emerald-600 text-emerald-600" />
                    </span>
                    <a
                      href="#reviews-anchor"
                      onClick={() => setActiveTab("reviews")}
                      className="text-xs text-slate-500 hover:text-indigo-600 hover:underline"
                    >
                      {summary.count} review{summary.count === 1 ? "" : "s"}
                    </a>
                  </>
                ) : (
                  <span className="text-xs text-slate-500">No reviews yet</span>
                )}
              </div>
            </div>

            {/* Price */}
            <div>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-3xl font-semibold text-slate-900">₹{activeVariant.price.toLocaleString("en-IN")}</span>
                {activeVariant.compareAtPrice && activeVariant.compareAtPrice > activeVariant.price && (
                  <span className="text-base text-slate-400 line-through">₹{activeVariant.compareAtPrice.toLocaleString("en-IN")}</span>
                )}
                {discountPercent > 0 && (
                  <span className="rounded-md bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">
                    Save ₹{(activeVariant.compareAtPrice! - activeVariant.price).toLocaleString("en-IN")} ({discountPercent}%)
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500">Inclusive of all taxes ({product.taxRate}% GST included)</p>
            </div>

            {highlights.length > 0 && (
              <ul className="space-y-1.5 border-t border-slate-100 pt-4 text-sm text-slate-600">
                {highlights.map((h, i) => (
                  <li key={i} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Variants (FR-PDP-02) */}
            {product.variants.length > 1 && (
              <div className="space-y-2" role="group" aria-labelledby="variant-label">
                <p id="variant-label" className="text-sm font-medium text-slate-900">
                  Select option
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((v, i) => (
                    <button
                      key={v.id}
                      onClick={() => {
                        setSelectedVariantIndex(i);
                        setQuantity(1);
                      }}
                      aria-pressed={selectedVariantIndex === i}
                      className={`rounded-xl border px-3.5 py-2 text-sm font-medium transition ${
                        selectedVariantIndex === i
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                          : "border-slate-200 text-slate-700 hover:border-slate-400"
                      } ${v.stock <= 0 ? "opacity-60" : ""}`}
                    >
                      {v.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Stock (FR-PDP-03) */}
            <div className="flex flex-wrap items-center gap-2">
              {activeVariant.stock <= 0 ? (
                <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700">Out of stock</span>
              ) : lowStock ? (
                <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                  Only {activeVariant.stock} left in stock - order soon
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                  <Check className="h-3.5 w-3.5" /> In stock, ready to ship
                </span>
              )}
              <span className="ml-auto font-mono text-[11px] text-slate-400">SKU: {activeVariant.sku}</span>
            </div>

            {/* Back-in-stock alert */}
            {activeVariant.stock <= 0 && (
              <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Bell className="h-4 w-4 text-amber-600" />
                  Notify me when this is back in stock
                </div>
                {alertDone[activeVariant.id] ? (
                  <p className="text-xs font-semibold text-emerald-700" role="status">
                    You are on the list. We will email you when it returns.
                  </p>
                ) : (
                  <form onSubmit={submitAlert} className="flex gap-2">
                    {user ? (
                      <p className="flex-1 truncate px-3 py-2 text-xs text-slate-600">{user.email}</p>
                    ) : (
                      <>
                        <label htmlFor="alert-email" className="sr-only">Email address</label>
                        <input
                          id="alert-email"
                          type="email"
                          required
                          value={alertEmail}
                          onChange={(e) => setAlertEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="input min-w-0 flex-1 py-2"
                        />
                      </>
                    )}
                    <button type="submit" disabled={alertBusy} className="btn-primary">
                      {alertBusy ? "Saving..." : "Notify me"}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Add to cart */}
            <div className="flex items-center gap-3">
              <div className="flex items-center rounded-xl border border-slate-300 bg-white p-1">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  aria-label="Decrease quantity"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-50 hover:text-indigo-600"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-9 text-center text-sm font-semibold text-slate-900" aria-live="polite">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(activeVariant.stock, quantity + 1))}
                  disabled={quantity >= activeVariant.stock || quantity >= 10}
                  aria-label="Increase quantity"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-50 hover:text-indigo-600 disabled:opacity-30"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={activeVariant.stock <= 0 || adding}
                className={`btn flex-1 py-3 ${
                  activeVariant.stock <= 0
                    ? "bg-slate-200 text-slate-400"
                    : added
                    ? "bg-emerald-600 text-white"
                    : "bg-indigo-600 text-white hover:bg-indigo-700"
                }`}
              >
                {added ? (
                  <>
                    <Check className="h-5 w-5" /> Added to bag
                  </>
                ) : (
                  <>
                    <ShoppingBag className="h-5 w-5" /> Add to bag
                  </>
                )}
              </button>
            </div>

            {/* Delivery PIN code (FR-PDP-04) */}
            <div className="space-y-2 rounded-xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <MapPin className="h-4 w-4 text-indigo-600" />
                <span>Check delivery availability</span>
              </div>
              <form onSubmit={handleCheckPincode} className="flex gap-2">
                <label htmlFor="pincode" className="sr-only">PIN code</label>
                <input
                  id="pincode"
                  type="text"
                  inputMode="numeric"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Enter 6-digit PIN code"
                  className="input flex-1 py-2 font-mono"
                />
                <button type="submit" className="btn-secondary">Check</button>
              </form>
              {pincodeStatus && (
                <p className={`text-xs ${pincodeStatus.includes("available") ? "font-semibold text-emerald-700" : "text-rose-600"}`} role="status">
                  {pincodeStatus}
                </p>
              )}
            </div>

            {/* Trust badges */}
            <ul className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-center">
              {trust.map(({ icon: Icon, text }) => (
                <li key={text} className="flex flex-col items-center gap-1.5 text-[11px] leading-tight text-slate-600">
                  <Icon className="h-5 w-5 text-indigo-600" />
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <section id="reviews-anchor" className="mt-10 scroll-mt-24 sm:mt-14" aria-label="Product information">
        <div role="tablist" aria-label="Product information" className="flex gap-1 overflow-x-auto border-b border-slate-200">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={activeTab === t.id}
              aria-controls={`panel-${t.id}`}
              onClick={() => setActiveTab(t.id)}
              className={`-mb-px whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                activeTab === t.id ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="card mt-4 p-5 sm:p-6">
          {activeTab === "description" && (
            <div role="tabpanel" id="panel-description" aria-labelledby="tab-description" className="max-w-3xl space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">Product overview</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{product.description}</p>
            </div>
          )}

          {activeTab === "specifications" && (
            <div role="tabpanel" id="panel-specifications" aria-labelledby="tab-specifications" className="max-w-3xl">
              <h2 className="mb-3 text-lg font-semibold text-slate-900">Specifications</h2>
              <dl className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 text-sm">
                {specs.map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[140px_1fr] gap-4 px-4 py-2.5 odd:bg-slate-50 sm:grid-cols-[200px_1fr]">
                    <dt className="font-medium text-slate-500">{k}</dt>
                    <dd className="break-words text-slate-900">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {activeTab === "reviews" && (
            <div role="tabpanel" id="panel-reviews" aria-labelledby="tab-reviews">
              <h2 id="reviews-heading" className="mb-5 text-lg font-semibold text-slate-900">Customer reviews</h2>
              {!summary || summary.count === 0 ? (
                <p className="text-sm text-slate-500">No reviews yet. Verified buyers can review this product after delivery.</p>
              ) : (
                <div className="grid grid-cols-1 gap-8 md:grid-cols-[240px_1fr]">
                  <div className="space-y-3">
                    <p className="text-4xl font-semibold text-slate-900">
                      {summary.average.toFixed(1)}
                      <span className="text-base font-medium text-slate-400"> / 5</span>
                    </p>
                    <p className="text-xs text-slate-500">{summary.count} review{summary.count === 1 ? "" : "s"}</p>
                    <ul className="space-y-1.5">
                      {summary.distribution.map((d) => (
                        <li key={d.star} className="flex items-center gap-2 text-xs text-slate-600">
                          <span className="w-6">{d.star}★</span>
                          <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                            <span className="block h-full bg-amber-400" style={{ width: `${(d.count / summary.count) * 100}%` }} />
                          </span>
                          <span className="w-5 text-right">{d.count}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <ul className="space-y-5">
                    {(product.reviews ?? []).map((r) => (
                      <li key={r.id} className="border-b border-slate-100 pb-5 last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="flex" aria-label={`${r.rating} out of 5 stars`}>
                            {[1, 2, 3, 4, 5].map((i) => (
                              <Star key={i} className={`h-3.5 w-3.5 ${i <= r.rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
                            ))}
                          </span>
                          {r.title && <span className="text-sm font-semibold text-slate-900">{r.title}</span>}
                        </div>
                        <p className="mt-1 text-sm text-slate-700">{r.comment}</p>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {r.author}
                          {r.isVerifiedBuyer && <span className="ml-2 font-semibold text-emerald-700">Verified buyer</span>}
                          {" - "}
                          {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
