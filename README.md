# 🛍️ Ripzy — Next-Gen Full-Stack E-Commerce Platform

<p align="center">
  <img src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200&q=80" alt="Ripzy Banner" width="100%" style="border-radius: 16px;" />
</p>

<p align="center">
  <strong>A design-first, production-grade e-commerce platform built with Next.js 16, Tailwind CSS v3.4, and Prisma ORM.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.4-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/TailwindCSS-v3.4-38bdf8?style=for-the-badge&logo=tailwind-css" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Prisma-SQLite-2d3748?style=for-the-badge&logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178c6?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/License-MIT-emerald?style=for-the-badge" alt="License" />
</p>

---

## 👨‍💻 Creator & Author
- **Lead Developer:** **Ripanshu Rana** ([@Rimpu165](https://github.com/Rimpu165))
- **Email:** `rimpurajput165@gmail.com`

---

## ✨ Features Implemented (Phase 1 MVP)

### 🏬 Storefront & Discovery
- **Hero & Promotions:** Dynamic hero banners, curated department tiles, and promotional discount pills.
- **Product Catalog:** Multi-facet filtering (category, brand, price), instant sorting, and no-result intelligent recommendations.
- **Product Detail Page (PDP):** Interactive zoom gallery, dynamic variant switcher (updates stock, price, and SKU), 6-digit postal PIN code delivery checker, and schema.org JSON-LD SEO tags.

### 🛒 Bag & Checkout Experience
- **Slide-Over Cart Drawer:** Real-time quantity adjustments, free delivery threshold indicator (₹999), coupon engine (`RIPZY10`, `WELCOME500`), and server-side price protection.
- **4-Step Wizard Checkout:** Address entry with PIN validation, delivery option, payment method selection, and review with Idempotency Key protection.
- **Stock Reservation:** 15-minute stock hold upon order initiation with automatic stock deduction and immutable `inventory_ledger` audit logs.

### 🛡️ RBAC Admin Backoffice (`/admin`)
- **Operations Dashboard:** Live KPI cards for Total Revenue, Orders Count, Average Order Value (AOV), and Active Customers.
- **Order Lifecycle Management:** State machine pipeline (`PENDING_PAYMENT` ➔ `CONFIRMED` ➔ `PROCESSING` ➔ `SHIPPED` ➔ `DELIVERED`) with Courier AWB tracking assignment.
- **Inventory Controller:** Real-time variant-level stock adjuster (+1, +10, -1, -5) with complete ledger history.

---

## 🛠️ Tech Stack & Database (28 Prisma Tables)
- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS v3.4 + Custom Glassmorphism System
- **Database:** SQLite via Prisma ORM (28 Tables implemented in `prisma/schema.prisma`)
- **Auth:** HTTP-only secure cookie sessions with `bcryptjs` and `jsonwebtoken`
- **Icons:** `lucide-react`

---

## 🚀 Getting Started

### 1. Clone & Install
```bash
git clone https://github.com/Rimpu165/ripzy-ecommerce.git
cd ripzy-ecommerce
npm install
```

### 2. Database Sync & Seed
```bash
npx prisma db push
npx tsx prisma/seed.ts
```

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Demo Login Accounts (Seeded)
- **Super Admin:** `admin@ripzy.com` | `Ripzy@1234`
- **Store Manager:** `manager@ripzy.com` | `Ripzy@1234`
- **Logistics Staff:** `staff@ripzy.com` | `Ripzy@1234`
- **Customer:** `customer@ripzy.com` | `Ripzy@1234`
