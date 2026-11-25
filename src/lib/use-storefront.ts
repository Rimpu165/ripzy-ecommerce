"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export interface StorefrontConfig {
  pages: { slug: string; title: string }[];
  categories: { id: string; name: string; slug: string }[];
  store: {
    name: string;
    supportEmail: string;
    supportPhone: string;
    address: string;
    freeShippingThreshold: number;
    returnWindowDays: number;
  };
}

const FALLBACK: StorefrontConfig = {
  pages: [],
  categories: [],
  store: {
    name: "Ripzy",
    supportEmail: "support@ripzy.com",
    supportPhone: "",
    address: "",
    freeShippingThreshold: 999,
    returnWindowDays: 7,
  },
};

const StorefrontContext = createContext<StorefrontConfig | null>(null);

/** Seeds navbar/footer with server-fetched data so categories render on first paint. */
export function StorefrontProvider({ initial, children }: { initial: StorefrontConfig; children: React.ReactNode }) {
  return React.createElement(StorefrontContext.Provider, { value: initial }, children);
}

let cached: StorefrontConfig | null = null;
let inflight: Promise<StorefrontConfig> | null = null;

function load(): Promise<StorefrontConfig> {
  if (cached) return Promise.resolve(cached);
  inflight ??= fetch("/api/storefront")
    .then((r) => (r.ok ? r.json() : FALLBACK))
    .then((d) => (cached = { ...FALLBACK, ...d }))
    .catch(() => FALLBACK)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Shared, deduplicated fetch of public storefront config (navbar + footer). */
export function useStorefront(): StorefrontConfig {
  const initial = useContext(StorefrontContext);
  const [data, setData] = useState<StorefrontConfig>(cached ?? initial ?? FALLBACK);
  useEffect(() => {
    if (initial) return; // already server-rendered
    let live = true;
    load().then((d) => live && setData(d));
    return () => {
      live = false;
    };
  }, [initial]);
  return initial ?? data;
}
