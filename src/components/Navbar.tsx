"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ShoppingBag, User as UserIcon, Search, Menu, X, LogOut, ChevronDown, Heart, Package,
  MapPin, Settings, LayoutDashboard, Truck, ShieldCheck, RotateCcw, Phone, ArrowRight,
} from "lucide-react";
import Logo from "@/components/ui/Logo";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useStorefront } from "@/lib/use-storefront";

interface Suggestion {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  price: number;
  image: string;
}

const ADMIN_ROLES = ["SUPER_ADMIN", "MANAGER", "STAFF"];

export default function Navbar() {
  const { user, logout } = useAuth();
  const { itemCount, setIsCartOpen } = useCart();
  const { wishlistCount } = useWishlist();
  const store = useStorefront();
  const router = useRouter();
  const pathname = usePathname();

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSuggest, setShowSuggest] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [scrolled, setScrolled] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const closeAll = useCallback(() => {
    setMenuOpen(false);
    setUserOpen(false);
    setShowSuggest(false);
  }, []);

  // Close menus on route change
  useEffect(() => {
    closeAll();
  }, [pathname, closeAll]);

  // Subtle shadow once the page scrolls
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll while the mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  // Outside click + Escape
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSuggest(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAll();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [closeAll]);

  // Debounced autocomplete (FR-CAT-05, 300ms) with request cancellation
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setShowSuggest(false);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/search/autocomplete?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions || []);
          setShowSuggest(true);
          setActiveIdx(-1);
        }
      } catch {
        /* aborted or offline */
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query]);

  const submitSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;
    closeAll();
    router.push(`/products?search=${encodeURIComponent(q)}`);
  };

  const onSearchKey = (e: React.KeyboardEvent) => {
    if (!showSuggest || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      closeAll();
      router.push(`/products/${suggestions[activeIdx].slug}`);
    }
  };

  const isAdmin = !!user && ADMIN_ROLES.includes(user.role);
  const threshold = store.store.freeShippingThreshold;
  const firstName = user?.name?.split(" ")[0] ?? "";

  const searchBox = (idPrefix: string) => (
    <div ref={idPrefix === "d" ? searchRef : undefined} className="relative w-full">
      <form onSubmit={submitSearch} role="search" className="relative">
        <label htmlFor={`${idPrefix}-search`} className="sr-only">Search products</label>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          id={`${idPrefix}-search`}
          type="search"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowSuggest(true)}
          onKeyDown={onSearchKey}
          placeholder="Search for products, brands and more"
          className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-20 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-50"
        />
        {searching && <span className="absolute right-20 top-1/2 -translate-y-1/2 text-xs text-slate-400">…</span>}
        <button type="submit" className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700">
          Search
        </button>
      </form>

      {idPrefix === "d" && showSuggest && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-pop animate-fade-in">
          <ul role="listbox" className="max-h-96 overflow-y-auto py-1.5">
            {suggestions.map((s, i) => (
              <li key={s.id} role="option" aria-selected={i === activeIdx}>
                <Link
                  href={`/products/${s.slug}`}
                  onClick={closeAll}
                  className={`flex items-center gap-3 px-3 py-2 transition ${i === activeIdx ? "bg-slate-50" : "hover:bg-slate-50"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.image} alt="" className="h-11 w-11 shrink-0 rounded-lg bg-slate-100 object-cover" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-800">{s.name}</span>
                    <span className="block text-xs text-slate-500">{s.brand || "Ripzy"}</span>
                  </span>
                  <span className="text-sm font-semibold text-slate-800">₹{s.price.toLocaleString("en-IN")}</span>
                </Link>
              </li>
            ))}
          </ul>
          <button onClick={() => submitSearch()} className="flex w-full items-center justify-center gap-1.5 border-t border-slate-100 bg-slate-50 py-2.5 text-xs font-semibold text-indigo-700 hover:bg-slate-100">
            See all results for “{query.trim()}” <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );

  const iconBtn =
    "relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-900";
  const badge =
    "absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-semibold text-white ring-2 ring-white";

  const menuItem = "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50";

  return (
    <header className="sticky top-0 z-40 w-full">
      {/* Announcement bar */}
      <div className="hidden border-b border-indigo-100 bg-indigo-50 text-slate-700 sm:block">
        <div className="container-page flex h-9 items-center justify-between text-xs">
          <p className="flex items-center gap-2">
            <Truck className="h-3.5 w-3.5 text-indigo-600" />
            Free delivery on orders above ₹{threshold.toLocaleString("en-IN")}
          </p>
          <div className="flex items-center gap-5 text-slate-600">
            <span className="hidden items-center gap-1.5 md:flex"><RotateCcw className="h-3.5 w-3.5" />{store.store.returnWindowDays}-day easy returns</span>
            <span className="hidden items-center gap-1.5 md:flex"><ShieldCheck className="h-3.5 w-3.5" />100% secure payments</span>
            {store.store.supportPhone && (
              <a href={`tel:${store.store.supportPhone.replace(/\s/g, "")}`} className="flex items-center gap-1.5 hover:text-indigo-700">
                <Phone className="h-3.5 w-3.5" />{store.store.supportPhone}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Main bar */}
      <div className={`border-b border-slate-200 bg-white transition-shadow ${scrolled ? "shadow-card" : ""}`}>
        <div className="container-page flex h-16 items-center gap-3 sm:gap-5">
          <button className={`${iconBtn} lg:hidden`} aria-label="Open menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>

          <Logo size={34} />

          <div className="mx-2 hidden max-w-2xl flex-1 md:block lg:mx-6">{searchBox("d")}</div>

          <div className="ml-auto flex items-center gap-1">
            <Link href="/wishlist" className={`${iconBtn} hidden sm:inline-flex`} aria-label={`Wishlist (${wishlistCount} items)`}>
              <Heart className="h-5 w-5" />
              {wishlistCount > 0 && <span className={badge}>{wishlistCount}</span>}
            </Link>

            {/* Account */}
            <div ref={userRef} className="relative">
              {user ? (
                <>
                  <button
                    onClick={() => setUserOpen((o) => !o)}
                    aria-haspopup="menu"
                    aria-expanded={userOpen}
                    className="flex h-10 items-center gap-2 rounded-xl px-2 text-sm text-slate-700 transition hover:bg-slate-100"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                      {firstName.charAt(0).toUpperCase()}
                    </span>
                    <span className="hidden max-w-[7rem] truncate font-medium xl:block">Hi, {firstName}</span>
                    <ChevronDown className={`hidden h-4 w-4 text-slate-400 transition xl:block ${userOpen ? "rotate-180" : ""}`} />
                  </button>
                  {userOpen && (
                    <div role="menu" className="absolute right-0 top-[calc(100%+8px)] w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-pop animate-fade-in">
                      <div className="border-b border-slate-100 px-3 pb-2.5 pt-1.5">
                        <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
                        <p className="truncate text-xs text-slate-500">{user.email}</p>
                      </div>
                      <div className="py-1.5">
                        <Link role="menuitem" href="/account/orders" className={menuItem}><Package className="h-4 w-4 text-slate-400" />My orders</Link>
                        <Link role="menuitem" href="/wishlist" className={menuItem}><Heart className="h-4 w-4 text-slate-400" />Wishlist</Link>
                        <Link role="menuitem" href="/account/addresses" className={menuItem}><MapPin className="h-4 w-4 text-slate-400" />Saved addresses</Link>
                        <Link role="menuitem" href="/account/profile" className={menuItem}><Settings className="h-4 w-4 text-slate-400" />Profile &amp; security</Link>
                        {isAdmin && (
                          <Link role="menuitem" href="/admin" className={`${menuItem} text-indigo-700`}><LayoutDashboard className="h-4 w-4" />Admin console</Link>
                        )}
                      </div>
                      <button
                        role="menuitem"
                        onClick={() => { setUserOpen(false); logout(); }}
                        className="flex w-full items-center gap-2.5 rounded-lg border-t border-slate-100 px-3 py-2.5 text-sm text-slate-600 transition hover:bg-slate-50"
                      >
                        <LogOut className="h-4 w-4 text-slate-400" />Sign out
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-1">
                  <Link href="/login" className="hidden h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 sm:inline-flex">
                    <UserIcon className="h-4 w-4" />Sign in
                  </Link>
                  <Link href="/register" className="hidden h-10 items-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700 sm:inline-flex">
                    Sign up
                  </Link>
                  <Link href="/login" className={`${iconBtn} sm:hidden`} aria-label="Sign in"><UserIcon className="h-5 w-5" /></Link>
                </div>
              )}
            </div>

            <button onClick={() => setIsCartOpen(true)} className={iconBtn} aria-label={`Open cart (${itemCount} items)`}>
              <ShoppingBag className="h-5 w-5" />
              {itemCount > 0 && <span className={badge}>{itemCount}</span>}
            </button>
          </div>
        </div>

        {/* Mobile search */}
        <div className="container-page pb-3 md:hidden">{searchBox("m")}</div>

        {/* Category strip */}
        <nav aria-label="Categories" className="hidden border-t border-slate-100 lg:block">
          <ul className="container-page flex h-11 items-center gap-1 text-sm">
            <li>
              <Link href="/products" className={`inline-flex h-8 items-center rounded-lg px-3 font-medium transition hover:bg-slate-100 ${pathname === "/products" ? "text-indigo-700" : "text-slate-700"}`}>
                All products
              </Link>
            </li>
            {store.categories.map((c) => (
              <li key={c.id}>
                <Link href={`/products?category=${c.slug}`} className="inline-flex h-8 items-center rounded-lg px-3 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900">
                  {c.name}
                </Link>
              </li>
            ))}
            <li className="ml-auto">
              <Link href="/products?sort=newest" className="inline-flex h-8 items-center rounded-lg px-3 font-medium text-indigo-700 transition hover:bg-indigo-50">
                New arrivals
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-slate-900/40 animate-fade-in" onClick={() => setMenuOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[84%] max-w-sm flex-col bg-white shadow-pop">
            <div className="flex h-16 items-center justify-between border-b border-slate-100 px-4">
              <Logo size={32} />
              <button className={iconBtn} aria-label="Close menu" onClick={() => setMenuOpen(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-4">
              {user ? (
                <div className="mb-4 flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700">{firstName.charAt(0).toUpperCase()}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
                    <p className="truncate text-xs text-slate-500">{user.email}</p>
                  </div>
                </div>
              ) : (
                <div className="mb-4 grid grid-cols-2 gap-2">
                  <Link href="/login" className="btn-secondary">Sign in</Link>
                  <Link href="/register" className="btn-primary">Sign up</Link>
                </div>
              )}

              <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Shop</p>
              <Link href="/products" className={menuItem}>All products</Link>
              {store.categories.map((c) => (
                <Link key={c.id} href={`/products?category=${c.slug}`} className={menuItem}>{c.name}</Link>
              ))}
              <Link href="/products?sort=newest" className={`${menuItem} text-indigo-700`}>New arrivals</Link>

              {user && (
                <>
                  <p className="px-3 pb-1 pt-5 text-xs font-medium uppercase tracking-wide text-slate-400">Account</p>
                  <Link href="/account/orders" className={menuItem}><Package className="h-4 w-4 text-slate-400" />My orders</Link>
                  <Link href="/wishlist" className={menuItem}><Heart className="h-4 w-4 text-slate-400" />Wishlist{wishlistCount > 0 && <span className="ml-auto text-xs text-slate-500">{wishlistCount}</span>}</Link>
                  <Link href="/account/addresses" className={menuItem}><MapPin className="h-4 w-4 text-slate-400" />Saved addresses</Link>
                  <Link href="/account/profile" className={menuItem}><Settings className="h-4 w-4 text-slate-400" />Profile &amp; security</Link>
                  {isAdmin && <Link href="/admin" className={`${menuItem} text-indigo-700`}><LayoutDashboard className="h-4 w-4" />Admin console</Link>}
                </>
              )}
              {!user && <Link href="/wishlist" className={`${menuItem} mt-3`}><Heart className="h-4 w-4 text-slate-400" />Wishlist</Link>}

              {store.pages.length > 0 && (
                <>
                  <p className="px-3 pb-1 pt-5 text-xs font-medium uppercase tracking-wide text-slate-400">Help</p>
                  {store.pages.slice(0, 6).map((p) => (
                    <Link key={p.slug} href={`/pages/${p.slug}`} className={menuItem}>{p.title}</Link>
                  ))}
                </>
              )}
            </div>
            {user && (
              <div className="border-t border-slate-100 p-3">
                <button onClick={() => { setMenuOpen(false); logout(); }} className="btn-secondary w-full"><LogOut className="h-4 w-4" />Sign out</button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
