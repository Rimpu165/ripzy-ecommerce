"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { Star, ShoppingBag, Check, Heart } from "lucide-react";

export interface ProductCardProps {
  id: string;
  name: string;
  slug: string;
  brandName?: string | null;
  categoryName?: string | null;
  price: number;
  compareAtPrice?: number | null;
  imageUrl?: string;
  variantsCount?: number;
  defaultVariantId: string;
  stock: number;
  rating?: number;
  reviewCount?: number;
}

export default function ProductCard({
  id,
  name,
  slug,
  brandName,
  price,
  compareAtPrice,
  imageUrl = "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80",
  defaultVariantId,
  stock,
  rating = 4.8,
  reviewCount = 124,
}: ProductCardProps) {
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const discountPercent =
    compareAtPrice && compareAtPrice > price
      ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
      : 0;

  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (stock <= 0 || adding) return;

    setAdding(true);
    await addToCart(defaultVariantId, 1);
    setAdding(false);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="group relative bg-white dark:bg-slate-900 rounded-3xl p-3 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500/50 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 flex flex-col justify-between">
      <Link href={`/products/${slug}`} className="block">
        {/* Product Image & Badges */}
        <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800/80 mb-3.5">
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          />

          {/* Discount Pill */}
          {discountPercent > 0 && (
            <div className="absolute top-2.5 left-2.5 bg-rose-500 text-white font-black text-[11px] px-2 py-0.5 rounded-full shadow-md">
              {discountPercent}% OFF
            </div>
          )}

          {/* Wishlist Button (FR-WISH-01) */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleWishlist(id);
            }}
            className={`absolute top-2.5 right-2.5 p-2 rounded-full backdrop-blur-md transition-all ${
              isInWishlist(id)
                ? "bg-rose-50 text-rose-500 shadow-md scale-110"
                : "bg-white/80 dark:bg-slate-900/80 text-slate-500 hover:text-rose-500 shadow-sm"
            }`}
            title={isInWishlist(id) ? "Remove from Wishlist" : "Add to Wishlist"}
          >
            <Heart className={`w-3.5 h-3.5 ${isInWishlist(id) ? "fill-rose-500" : ""}`} />
          </button>

          {/* Stock State Badge (FR-PDP-03 & FR-CAT-07) */}
          <div className="absolute bottom-2.5 left-2.5">
            {stock <= 0 ? (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-900/80 text-white rounded-md backdrop-blur-sm">
                Out of Stock
              </span>
            ) : stock <= 5 ? (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/90 text-white rounded-md backdrop-blur-sm animate-pulse">
                Only {stock} left!
              </span>
            ) : (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-600/90 text-white rounded-md backdrop-blur-sm">
                In Stock
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="space-y-1.5 px-1">
          {brandName && (
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              {brandName}
            </span>
          )}
          <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {name}
          </h3>

          {/* Ratings */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 pt-0.5">
            <div className="flex items-center text-amber-400">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
            </div>
            <span className="font-bold text-slate-800 dark:text-slate-200">{rating}</span>
            <span className="text-[11px]">({reviewCount})</span>
          </div>
        </div>
      </Link>

      {/* Pricing & Add to Cart button */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between px-1">
        <div>
          <div className="text-base font-extrabold text-slate-900 dark:text-white">
            ₹{price.toLocaleString("en-IN")}
          </div>
          {compareAtPrice && compareAtPrice > price && (
            <div className="text-xs text-slate-400 line-through">
              ₹{compareAtPrice.toLocaleString("en-IN")}
            </div>
          )}
        </div>

        <button
          onClick={handleQuickAdd}
          disabled={stock <= 0 || adding}
          className={`p-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
            stock <= 0
              ? "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
              : added
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
              : "bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-indigo-600 dark:hover:bg-indigo-500 dark:hover:text-white shadow-sm hover:scale-105 active:scale-95"
          }`}
          title={stock <= 0 ? "Out of stock" : "Add to Cart"}
        >
          {added ? <Check className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
