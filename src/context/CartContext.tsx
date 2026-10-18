"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";

export interface CartItem {
  id: string;
  variantId: string;
  productId: string;
  productName: string;
  variantTitle: string;
  sku: string;
  price: number;
  compareAtPrice?: number | null;
  quantity: number;
  stockAvailable: number;
  image: string;
  lineTotal: number;
}

interface CartContextType {
  items: CartItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  shippingTotal: number;
  grandTotal: number;
  itemCount: number;
  couponCode: string | null;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  addToCart: (variantId: string, quantity?: number) => Promise<{ success: boolean; error?: string }>;
  updateQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  removeItem: (cartItemId: string) => Promise<void>;
  applyCoupon: (code: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  removeCoupon: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [discountTotal, setDiscountTotal] = useState(0);
  const [taxTotal, setTaxTotal] = useState(0);
  const [shippingTotal, setShippingTotal] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);
  const [itemCount, setItemCount] = useState(0);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const getGuestSessionId = () => {
    if (typeof window === "undefined") return "";
    let sid = localStorage.getItem("ripzy_guest_session");
    if (!sid) {
      sid = "guest_" + Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem("ripzy_guest_session", sid);
    }
    return sid;
  };

  const refreshCart = async () => {
    try {
      const sid = getGuestSessionId();
      const res = await fetch(`/api/cart?guestSessionId=${sid}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setSubtotal(data.subtotal || 0);
        setDiscountTotal(data.discountTotal || 0);
        setTaxTotal(data.taxTotal || 0);
        setShippingTotal(data.shippingTotal || 0);
        setGrandTotal(data.grandTotal || 0);
        setItemCount(data.itemCount || 0);
        setCouponCode(data.couponCode || null);
      }
    } catch (err) {
      console.error("Cart refresh error:", err);
    }
  };

  useEffect(() => {
    refreshCart();
  }, [user]);

  const addToCart = async (variantId: string, quantity = 1) => {
    try {
      const sid = getGuestSessionId();
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId, quantity, guestSessionId: sid }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Failed to add to cart" };
      }
      await refreshCart();
      setIsCartOpen(true);
      return { success: true };
    } catch {
      return { success: false, error: "Network error occurred." };
    }
  };

  const updateQuantity = async (cartItemId: string, quantity: number) => {
    try {
      const sid = getGuestSessionId();
      await fetch("/api/cart", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartItemId, quantity, guestSessionId: sid }),
      });
      await refreshCart();
    } catch (err) {
      console.error("Update quantity error:", err);
    }
  };

  const removeItem = async (cartItemId: string) => {
    await updateQuantity(cartItemId, 0);
  };

  const applyCoupon = async (code: string) => {
    try {
      const sid = getGuestSessionId();
      const res = await fetch("/api/coupons/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, guestSessionId: sid }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Invalid coupon" };
      }
      await refreshCart();
      return { success: true, message: data.message };
    } catch {
      return { success: false, error: "Network error" };
    }
  };

  const removeCoupon = async () => {
    try {
      const sid = getGuestSessionId();
      await fetch("/api/coupons/apply", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestSessionId: sid }),
      });
      await refreshCart();
    } catch (err) {
      console.error("Remove coupon error:", err);
    }
  };

  return (
    <CartContext.Provider
      value={{
        items,
        subtotal,
        discountTotal,
        taxTotal,
        shippingTotal,
        grandTotal,
        itemCount,
        couponCode,
        isCartOpen,
        setIsCartOpen,
        addToCart,
        updateQuantity,
        removeItem,
        applyCoupon,
        removeCoupon,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
