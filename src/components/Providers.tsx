"use client";

import React from "react";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { WishlistProvider } from "@/context/WishlistContext";
import CartDrawer from "./CartDrawer";
import { ToastProvider } from "./ui/Toast";
import { StorefrontProvider, type StorefrontConfig } from "@/lib/use-storefront";

export default function Providers({
  children,
  storefront,
}: {
  children: React.ReactNode;
  storefront: StorefrontConfig;
}) {
  return (
    <StorefrontProvider initial={storefront}>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              {children}
              <CartDrawer />
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </StorefrontProvider>
  );
}
