"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { Star, ShoppingBag, Check, Heart, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

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

export function ProductCardSkeleton() {
  return (
    <div className="card space-y-3 p-3">
      <Skeleton className="aspect-square w-full" />
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-6 w-1/2" />
    </div>
  );
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
  rating,
  reviewCount = 0,
}: ProductCardProps) {
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const wished = isInWishlist(id);
  const discountPercent =
    compareAtPrice && compareAtPrice > price ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100) : 0;

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
    <div className="group card relative flex h-full flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-card">
      <Link href={`/products/${slug}`} className="block flex-1">
        {/* Image */}
        <div className="relative aspect-square w-full overflow-hidden bg-slate-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={name}
            loading="lazy"
            className={`h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105 ${
              stock <= 0 ? "opacity-60" : ""
            }`}
          />

          {discountPercent > 0 && (
            <span className="absolute left-2.5 top-2.5 rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
              {discountPercent}% off
            </span>
          )}

          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleWishlist(id);
            }}
            className={`absolute right-2.5 top-2.5 rounded-full border p-2 shadow-subtle transition ${
              wished
                ? "border-rose-100 bg-rose-50 text-rose-500"
                : "border-slate-200 bg-white text-slate-500 hover:text-rose-500"
            }`}
            title={wished ? "Remove from Wishlist" : "Add to Wishlist"}
            aria-label={wished ? `Remove ${name} from wishlist` : `Add ${name} to wishlist`}
            aria-pressed={wished}
          >
            <Heart className={`h-3.5 w-3.5 ${wished ? "fill-rose-500" : ""}`} />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-1 px-3 pt-3">
          {brandName && <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{brandName}</p>}
          <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-5 text-slate-900 transition-colors group-hover:text-indigo-600">
            {name}
          </h3>

          <div className="flex h-5 items-center gap-1.5 text-xs text-slate-500">
            {reviewCount > 0 && rating ? (
              <>
                <span className="inline-flex items-center gap-0.5 rounded bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-700">
                  {rating.toFixed(1)}
                  <Star className="h-3 w-3 fill-emerald-600 text-emerald-600" />
                </span>
                <span className="text-[11px]">({reviewCount})</span>
              </>
            ) : (
              <span className="text-[11px] text-slate-400">No reviews yet</span>
            )}
          </div>
        </div>
      </Link>

      {/* Price + quick add */}
      <div className="flex items-end justify-between gap-2 px-3 pb-3 pt-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-base font-semibold text-slate-900">₹{price.toLocaleString("en-IN")}</span>
            {compareAtPrice && compareAtPrice > price && (
              <span className="text-xs text-slate-400 line-through">₹{compareAtPrice.toLocaleString("en-IN")}</span>
            )}
          </div>
          <p
            className={`mt-0.5 text-[11px] font-medium ${
              stock <= 0 ? "text-rose-600" : stock <= 5 ? "text-amber-700" : "text-emerald-700"
            }`}
          >
            {stock <= 0 ? "Out of stock" : stock <= 5 ? `Only ${stock} left` : "In stock"}
          </p>
        </div>

        <button
          onClick={handleQuickAdd}
          disabled={stock <= 0 || adding}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${
            stock <= 0
              ? "cursor-not-allowed bg-slate-100 text-slate-400"
              : added
              ? "bg-emerald-50 text-emerald-700"
              : "bg-indigo-600 text-white hover:bg-indigo-700"
          }`}
          title={stock <= 0 ? "Out of stock" : "Add to Cart"}
          aria-label={stock <= 0 ? `${name} is out of stock` : `Add ${name} to cart`}
        >
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : added ? <Check className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
