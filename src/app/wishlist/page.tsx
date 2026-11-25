"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { Heart, ShoppingBag, Trash2, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { ProductCardSkeleton } from "@/components/ProductCard";

export default function WishlistPage() {
  const { user, loading: authLoading } = useAuth();
  const { addToCart } = useCart();
  const { toggleWishlist } = useWishlist();

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWishlist = async () => {
    try {
      const res = await fetch("/api/wishlist");
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        fetchWishlist();
      } else {
        setLoading(false);
      }
    }
  }, [user, authLoading]);

  const handleMoveToCart = async (productId: string, defaultVariantId: string) => {
    await addToCart(defaultVariantId, 1);
    await toggleWishlist(productId);
    await fetchWishlist();
  };

  const handleRemove = async (productId: string) => {
    await toggleWishlist(productId);
    await fetchWishlist();
  };

  if (authLoading || loading) {
    return (
      <div className="container-page space-y-6 py-8" aria-busy="true" aria-label="Loading your wishlist">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md space-y-4 px-4 py-20 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-500">
          <Heart className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">Sign in to view your wishlist</h1>
        <p className="text-sm text-slate-500">Save products to your wishlist and access them anytime across all your devices.</p>
        <Link href="/login?next=/wishlist" className="btn-primary">
          Sign in <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="container-page space-y-6 py-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900 sm:text-3xl">
          <Heart className="h-6 w-6 fill-rose-500 text-rose-500" />
          My wishlist
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {items.length} {items.length === 1 ? "saved item" : "saved items"}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="card space-y-4 p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <Heart className="h-7 w-7" />
          </div>
          <h2 className="text-base font-semibold text-slate-900">Your wishlist is empty</h2>
          <p className="mx-auto max-w-sm text-sm text-slate-500">
            Save items that you like by clicking the heart icon on any product card.
          </p>
          <Link href="/products" className="btn-primary">
            Explore products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {items.map(({ id: wishlistId, product }) => {
            const defaultVariant = product.variants[0];
            const primaryImg = product.images.find((img: any) => img.isPrimary)?.url || product.images[0]?.url;
            const outOfStock = !defaultVariant || defaultVariant.stock <= 0;
            const mrp = defaultVariant?.compareAtPrice;
            const off = mrp && mrp > defaultVariant.price ? Math.round(((mrp - defaultVariant.price) / mrp) * 100) : 0;

            return (
              <div key={wishlistId} className="group card flex flex-col overflow-hidden transition hover:shadow-card">
                <div className="relative aspect-square w-full overflow-hidden bg-slate-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={primaryImg}
                    alt={product.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {off > 0 && (
                    <span className="absolute left-2.5 top-2.5 rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                      {off}% off
                    </span>
                  )}
                  <button
                    onClick={() => handleRemove(product.id)}
                    className="absolute right-2.5 top-2.5 rounded-full border border-slate-200 bg-white p-2 text-slate-500 shadow-subtle transition hover:text-rose-600"
                    title="Remove from wishlist"
                    aria-label={`Remove ${product.name} from wishlist`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex flex-1 flex-col justify-between gap-3 p-3">
                  <div>
                    {product.brand?.name && (
                      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{product.brand.name}</p>
                    )}
                    <Link href={`/products/${product.slug}`}>
                      <h3 className="mt-0.5 line-clamp-2 text-sm font-medium text-slate-900 transition-colors hover:text-indigo-600">
                        {product.name}
                      </h3>
                    </Link>
                    <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
                      <span className="text-base font-semibold text-slate-900">
                        ₹{defaultVariant?.price.toLocaleString("en-IN")}
                      </span>
                      {off > 0 && (
                        <span className="text-xs text-slate-400 line-through">₹{mrp.toLocaleString("en-IN")}</span>
                      )}
                    </div>
                    {outOfStock && <p className="mt-0.5 text-[11px] font-medium text-rose-600">Out of stock</p>}
                  </div>

                  <button
                    onClick={() => handleMoveToCart(product.id, defaultVariant.id)}
                    disabled={outOfStock}
                    className="btn-primary w-full py-2"
                  >
                    <ShoppingBag className="h-4 w-4" /> Move to bag
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
