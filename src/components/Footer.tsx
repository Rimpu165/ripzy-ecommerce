import React from "react";
import Link from "next/link";
import { ShieldCheck, Truck, RotateCcw, Award } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-400 text-sm border-t border-slate-800">
      {/* Trust Badges */}
      <div className="border-b border-slate-900 bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Free Delivery</h4>
              <p className="text-[11px] text-slate-500">On all orders above ₹999</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Secure Payment</h4>
              <p className="text-[11px] text-slate-500">256-bit encrypted Razorpay</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">7-Day Returns</h4>
              <p className="text-[11px] text-slate-500">Hassle-free replacements</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">100% Genuine</h4>
              <p className="text-[11px] text-slate-500">Direct brand warranty</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-5 gap-8">
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-rose-500 flex items-center justify-center text-white font-extrabold text-sm">
              R
            </span>
            <span className="text-xl font-black text-white">Ripzy.</span>
          </div>
          <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
            Ripzy is the premier destination for design-first electronics, audiophile sound systems, and minimalist mechanical workspace gear.
          </p>
          <div className="pt-2 text-xs text-slate-500 space-y-1">
            <p>Customer Care: support@ripzy.com</p>
            <p>Hotline: +91 98765 43210 (10 AM - 7 PM)</p>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">Shop Categories</h4>
          <ul className="space-y-2 text-xs">
            <li>
              <Link href="/products?category=electronics" className="hover:text-white transition-colors">
                Electronics & Phones
              </Link>
            </li>
            <li>
              <Link href="/products?category=audio" className="hover:text-white transition-colors">
                Noise Cancelling Audio
              </Link>
            </li>
            <li>
              <Link href="/products?category=workspace" className="hover:text-white transition-colors">
                Custom Mechanical Keyboards
              </Link>
            </li>
            <li>
              <Link href="/products?category=wearables" className="hover:text-white transition-colors">
                Smart Wearables
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">Customer Care</h4>
          <ul className="space-y-2 text-xs">
            <li>
              <Link href="/account/orders" className="hover:text-white transition-colors">
                Track Your Order
              </Link>
            </li>
            <li>
              <Link href="/pages/returns" className="hover:text-white transition-colors">
                Return & Refund Policy
              </Link>
            </li>
            <li>
              <Link href="/pages/shipping" className="hover:text-white transition-colors">
                Shipping Information
              </Link>
            </li>
            <li>
              <Link href="/pages/faq" className="hover:text-white transition-colors">
                Frequently Asked Questions
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">Company</h4>
          <ul className="space-y-2 text-xs">
            <li>
              <Link href="/pages/about" className="hover:text-white transition-colors">
                About Ripzy
              </Link>
            </li>
            <li>
              <Link href="/pages/privacy" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/pages/terms" className="hover:text-white transition-colors">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link href="/admin" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                Admin Portal
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-slate-900 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
        <p>© {new Date().getFullYear()} Ripzy Technologies Pvt. Ltd. All rights reserved.</p>
        <p className="flex items-center gap-2">
          <span>Accepted Payments:</span>
          <span className="font-semibold text-slate-400">Razorpay • UPI • Cards • NetBanking • COD</span>
        </p>
      </div>
    </footer>
  );
}
