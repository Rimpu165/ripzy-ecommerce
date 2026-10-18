"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import {
  ShoppingBag,
  User as UserIcon,
  Search,
  Menu,
  X,
  ShieldCheck,
  LogOut,
  ChevronDown,
} from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { itemCount, setIsCartOpen } = useCart();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/products?search=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  const isAdminOrStaff = user && ["SUPER_ADMIN", "MANAGER", "STAFF"].includes(user.role);

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-rose-500 flex items-center justify-center text-white font-extrabold text-lg shadow-glow group-hover:scale-105 transition-transform">
              R
            </span>
            <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Ripzy<span className="text-indigo-600 dark:text-indigo-400">.</span>
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
            <Link href="/products" className="hover:text-indigo-600 dark:hover:text-white transition-colors">
              All Products
            </Link>
            <Link href="/products?category=electronics" className="hover:text-indigo-600 dark:hover:text-white transition-colors">
              Electronics
            </Link>
            <Link href="/products?category=audio" className="hover:text-indigo-600 dark:hover:text-white transition-colors">
              Audio
            </Link>
            <Link href="/products?category=workspace" className="hover:text-indigo-600 dark:hover:text-white transition-colors">
              Keyboards
            </Link>
          </nav>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="hidden lg:flex flex-1 max-w-md relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search audio, mechanical keyboards, phones..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-full border border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all shadow-inner"
          />
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
        </form>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Cart Trigger */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
            aria-label="View Shopping Cart"
          >
            <ShoppingBag className="w-5 h-5" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center animate-bounce shadow-md">
                {itemCount}
              </span>
            )}
          </button>

          {/* User Account / Auth */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 p-1.5 pl-2 pr-3 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
                  {user.name.charAt(0)}
                </div>
                <span className="hidden sm:inline max-w-[100px] truncate">{user.name.split(" ")[0]}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {userDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 py-2 z-50 animate-slide-up"
                  onMouseLeave={() => setUserDropdownOpen(false)}
                >
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user.name}</p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    {user.role !== "CUSTOMER" && (
                      <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-md">
                        {user.role}
                      </span>
                    )}
                  </div>

                  {isAdminOrStaff && (
                    <Link
                      href="/admin"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 font-semibold"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Admin Dashboard
                    </Link>
                  )}

                  <Link
                    href="/account/orders"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    My Orders
                  </Link>

                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-indigo-600 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="hidden sm:inline-flex px-4 py-1.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-full shadow-sm hover:shadow transition-all"
              >
                Sign Up
              </Link>
            </div>
          )}

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-3 pb-6 space-y-3">
          <form onSubmit={handleSearch} className="relative mb-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 rounded-full"
            />
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          </form>
          <Link
            href="/products"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            All Products
          </Link>
          <Link
            href="/products?category=electronics"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Electronics
          </Link>
          <Link
            href="/products?category=audio"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Audio & Headphones
          </Link>
        </div>
      )}
    </header>
  );
}
