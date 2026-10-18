"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { Heart, ShoppingBag, Trash2, ArrowRight } from "lucide-react";

export default function WishlistPage() {
  const { user, loading: authLoading } = useAuth();
  const { addToCart } = useCart();
  const { toggleWishlist, refreshWishlist } = useWishlist();

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
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-sm text-slate-500">
        Loading your wishlist...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-500 flex items-center justify-center mx-auto">
          <Heart className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Sign In to View Wishlist</h2>
        <p className="text-xs text-slate-500">Save products to your wishlist and access them anytime across all your devices.</p>
        <Link
          href="/login?next=/wishlist"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-indigo-600 text-white font-bold text-xs shadow-md shadow-indigo-600/30"
        >
          Sign In Now <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
          <Heart className="w-7 h-7 text-rose-500 fill-rose-500" />
          My Wishlist
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          {items.length} {items.length === 1 ? "saved item" : "saved items"}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 border border-slate-200 dark:border-slate-800 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <Heart className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Your Wishlist is Empty</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Save items that you like by clicking the heart icon on any product card!
          </p>
          <Link
            href="/products"
            className="inline-block px-5 py-2.5 rounded-full bg-indigo-600 text-white font-bold text-xs shadow-md shadow-indigo-600/20"
          >
            Explore Catalog
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map(({ id: wishlistId, product }) => {
            const defaultVariant = product.variants[0];
            const primaryImg = product.images.find((img: any) => img.isPrimary)?.url || product.images[0]?.url;

            return (
              <div
                key={wishlistId}
                className="group relative bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 mb-3.5">
                    <img
                      src={primaryImg}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <button
                      onClick={() => handleRemove(product.id)}
                      className="absolute top-2.5 right-2.5 p-2 rounded-full bg-white/80 dark:bg-slate-900/80 text-rose-500 hover:scale-110 transition-all shadow-sm"
                      title="Remove from wishlist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    {product.brand?.name}
                  </span>
                  <Link href={`/products/${product.slug}`}>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2 hover:text-indigo-600 transition-colors mt-0.5">
                      {product.name}
                    </h3>
                  </Link>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="text-base font-black text-slate-900 dark:text-white">
                    ₹{defaultVariant?.price.toLocaleString("en-IN")}
                  </div>

                  <button
                    onClick={() => handleMoveToCart(product.id, defaultVariant.id)}
                    disabled={!defaultVariant || defaultVariant.stock <= 0}
                    className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                  >
                    <ShoppingBag className="w-4 h-4" /> Move to Bag
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
