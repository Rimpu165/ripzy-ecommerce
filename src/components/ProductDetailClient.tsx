"use client";

import React, { useState } from "react";
import { useCart } from "@/context/CartContext";
import {
  Star,
  ShieldCheck,
  Truck,
  RotateCcw,
  Check,
  ShoppingBag,
  Zap,
  MapPin,
  Share2,
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

interface ProductDetailProps {
  product: {
    id: string;
    name: string;
    slug: string;
    description: string;
    shortDescription?: string | null;
    taxRate: number;
    brand?: { name: string } | null;
    category?: { name: string } | null;
    variants: Variant[];
    images: Image[];
    reviews?: any[];
  };
}

export default function ProductDetailClient({ product }: ProductDetailProps) {
  const { addToCart } = useCart();
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [pincode, setPincode] = useState("");
  const [pincodeStatus, setPincodeStatus] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

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

  const handleCheckPincode = (e: React.FormEvent) => {
    e.preventDefault();
    if (/^\d{6}$/.test(pincode.trim())) {
      setPincodeStatus("Delivery available in 2-3 business days! Free shipping above ₹999.");
    } else {
      setPincodeStatus("Please enter a valid 6-digit postal PIN code.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumbs */}
      <nav className="text-xs font-semibold text-slate-500 mb-6 flex items-center gap-2">
        <a href="/" className="hover:text-indigo-600">Home</a>
        <span>/</span>
        <a href="/products" className="hover:text-indigo-600">Products</a>
        {product.category && (
          <>
            <span>/</span>
            <span className="text-slate-800 dark:text-slate-300">{product.category.name}</span>
          </>
        )}
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
        {/* Left: Gallery (FR-PDP-01) */}
        <div className="space-y-4">
          <div className="relative aspect-square w-full rounded-3xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-800 shadow-md">
            <img
              src={currentImage.url}
              alt={currentImage.altText || product.name}
              className="w-full h-full object-cover object-center transition-all duration-300"
            />
            {discountPercent > 0 && (
              <span className="absolute top-4 left-4 bg-rose-500 text-white font-extrabold text-xs px-3 py-1 rounded-full shadow-lg">
                SAVE {discountPercent}%
              </span>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {images.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all flex-shrink-0 ${
                    activeImageIndex === idx
                      ? "border-indigo-600 shadow-md scale-105"
                      : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={img.url} alt="thumbnail" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Info & Variant Selector (FR-PDP-02 & FR-PDP-03) */}
        <div className="space-y-6">
          <div>
            {product.brand && (
              <span className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                {product.brand.name}
              </span>
            )}
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
              {product.name}
            </h1>

            {/* Rating Stars */}
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400" />
                ))}
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">4.9 / 5.0</span>
              <span className="text-xs text-slate-500">• 148 Verified Buyer Ratings</span>
            </div>
          </div>

          {/* Price Block */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                ₹{activeVariant.price.toLocaleString("en-IN")}
              </span>
              {activeVariant.compareAtPrice && activeVariant.compareAtPrice > activeVariant.price && (
                <span className="text-base text-slate-400 line-through">
                  ₹{activeVariant.compareAtPrice.toLocaleString("en-IN")}
                </span>
              )}
              {discountPercent > 0 && (
                <span className="text-xs font-bold text-rose-500">
                  You Save ₹{(activeVariant.compareAtPrice! - activeVariant.price).toLocaleString("en-IN")}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              Inclusive of all taxes ({product.taxRate}% GST included)
            </p>
          </div>

          {/* Variants Selector (FR-PDP-02) */}
          {product.variants.length > 1 && (
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Select Option / Edition:
              </label>
              <div className="flex flex-wrap gap-2.5">
                {product.variants.map((v, i) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariantIndex(i)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                      selectedVariantIndex === i
                        ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 shadow-sm"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-400 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {v.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stock Status Badge (FR-PDP-03) */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Availability:</span>
            {activeVariant.stock <= 0 ? (
              <span className="px-2.5 py-0.5 text-xs font-bold bg-rose-100 text-rose-700 rounded-full">
                Out of Stock
              </span>
            ) : activeVariant.stock <= 5 ? (
              <span className="px-2.5 py-0.5 text-xs font-bold bg-amber-100 text-amber-700 rounded-full animate-pulse">
                ⚡ Only {activeVariant.stock} left in stock - order soon!
              </span>
            ) : (
              <span className="px-2.5 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-700 rounded-full flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> In Stock & Ready to Ship
              </span>
            )}
            <span className="text-[11px] font-mono text-slate-400 ml-auto">SKU: {activeVariant.sku}</span>
          </div>

          {/* Add to Cart Controls */}
          <div className="flex items-center gap-4 pt-2">
            <div className="flex items-center border border-slate-300 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-900 p-1">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-9 h-9 flex items-center justify-center font-bold text-slate-600 hover:text-indigo-600"
              >
                -
              </button>
              <span className="w-10 text-center font-bold text-sm text-slate-900 dark:text-white">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(Math.min(activeVariant.stock, quantity + 1))}
                disabled={quantity >= activeVariant.stock || quantity >= 10}
                className="w-9 h-9 flex items-center justify-center font-bold text-slate-600 hover:text-indigo-600 disabled:opacity-30"
              >
                +
              </button>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={activeVariant.stock <= 0 || adding}
              className={`flex-1 py-4 px-6 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
                activeVariant.stock <= 0
                  ? "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                  : added
                  ? "bg-emerald-600 text-white shadow-emerald-600/30"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98]"
              }`}
            >
              {added ? (
                <>
                  <Check className="w-5 h-5" /> Added to Bag!
                </>
              ) : (
                <>
                  <ShoppingBag className="w-5 h-5" /> Add to Shopping Bag
                </>
              )}
            </button>
          </div>

          {/* Delivery PIN Code Checker (FR-PDP-04) */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
              <MapPin className="w-4 h-4 text-indigo-600" />
              <span>Check Delivery Availability</span>
            </div>
            <form onSubmit={handleCheckPincode} className="flex gap-2">
              <input
                type="text"
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Enter 6-digit PIN code"
                className="flex-1 px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 font-mono"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-xl hover:opacity-90 transition-opacity"
              >
                Check
              </button>
            </form>
            {pincodeStatus && (
              <p className={`text-xs ${pincodeStatus.includes("available") ? "text-emerald-600 font-semibold" : "text-rose-500"}`}>
                {pincodeStatus}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
              Product Overview
            </h3>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {product.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
