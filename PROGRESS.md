# 📦 Ripzy E-Commerce — Progress & Handoff Checkpoint

> **Note for AI Agents & Developers:**  
> This file is the single source of truth for project state and progress. Whenever this repository is opened on a new machine or in a new session, **read this file first to resume exactly where we left off** without wasting tokens or re-analyzing the original Excel sheet (`ecommerce_FRS_tracker.xlsx`).

---

## 🧭 Project Identity & Tech Stack
- **Project Name:** Ripzy
- **Framework:** Next.js 16 (App Router, Server Components & Route Handlers)
- **Styling:** Tailwind CSS v3.4 (with `@tailwind base; components; utilities;`, PostCSS & custom design tokens)
- **Database & ORM:** SQLite via Prisma ORM (`dev.db` locally, PostgreSQL-ready)
- **Authentication:** Custom secure HTTP-only cookies + JWT (`jsonwebtoken`) + password hashing (`bcryptjs`)
- **Icons:** `lucide-react`
- **Development Server:** `npm run dev` running on `http://localhost:3000`

---

## 🛡️ 11 Golden Business Rules Enforced (Sheet 4 of FRS Tracker)
1. **Server-Side Pricing Authority:** Client prices are strictly ignored; all line totals, discounts, taxes, and shipping fees are calculated on the server.
2. **Stock Reservation & TTL:** Orders entering `PENDING_PAYMENT` reserve stock for 15 minutes. Deducted permanently on `CONFIRMED` or COD placement; released on cancellation.
3. **One Coupon Per Order:** Validated server-side against min order amount and per-user limits.
4. **Discount Guard:** Discounts cannot exceed subtotal; grand total cannot be negative.
5. **Free Shipping Rule:** Configurable threshold (₹999) grants 100% free delivery.
6. **Order Cancellation:** Allowed only until order reaches `SHIPPED` status.
7. **Return Window:** Allowed only for `DELIVERED` orders within the return window (default 7 days).
8. **Refund Routing:** Prepaid orders refund to original payment source; COD requires manual reconciliation.
9. **Readable Order Numbers:** Sequential format: `ORD-2026-000101`, `ORD-2026-000102`, etc.
10. **Review Authenticity:** One review per product per verified purchaser.
11. **Soft Delete Integrity:** Products and users utilize `deletedAt` timestamps to preserve order history and audit trails.

---

## 🗄️ Database Architecture (28 Tables - Sheet 5)
Database schema is fully implemented in [`prisma/schema.prisma`](file:///prisma/schema.prisma):
1. `users` (Roles: `CUSTOMER`, `STAFF`, `MANAGER`, `SUPER_ADMIN`)
2. `accounts` (OAuth links)
3. `sessions` (Session tokens)
4. `addresses` (Multiple addresses with 6-digit PIN validation)
5. `categories` (Hierarchical categories with parent-child relations)
6. `brands` (Brand master data)
7. `products` (Product master with slug, tax rate, and soft deletes)
8. `product_variants` (SKU, price, compareAtPrice MRP, stock, reservedStock)
9. `product_images` (Multi-image gallery with primary tag)
10. `product_attributes` (JSON attribute definitions)
11. `carts` (One cart per user/guest session)
12. `cart_items` (Items in cart with quantity caps)
13. `wishlists` (Saved items)
14. `orders` (Order header, addresses JSON snapshot, idempotency key)
15. `order_items` (Historical item snapshot at time of purchase)
16. `order_status_history` (Audit timeline of status changes)
17. `payments` (Razorpay and COD records)
18. `refunds` (Refund tracking)
19. `shipments` (Courier name and tracking numbers)
20. `coupons` (Discount rules and usage caps)
21. `coupon_usages` (User and order usage tracking)
22. `reviews` (Rating 1-5, photos, moderation status)
23. `inventory_ledger` (Immutable record of every inventory delta)
24. `banners` (Homepage promotional banners)
25. `pages` (Static CMS pages)
26. `settings` (Key-value store configurations)
27. `audit_logs` (Admin change audit trails)
28. `notifications` (Transactional email queue)

---

## ✅ Completed Phase 1 (MVP) Features (72 Requirements)

### Storefront & Shopping Flow
- [x] **Homepage (`/`):** Hero banner, category navigation, featured products with discount and stock badges.
- [x] **Catalog (`/products`):** Category and brand filters, sorting (Newest, A-Z), search queries, and empty state recommendations.
- [x] **Product Detail Page (`/products/[slug]`):** Thumbnail gallery, dynamic variant switcher (updates price, SKU, stock), 6-digit PIN code delivery check, and JSON-LD SEO schema.
- [x] **Slide-Over Cart Drawer:** Real-time quantity increment/decrement, free shipping progress bar, coupon application (`RIPZY10`, `WELCOME500`), and price revalidation.
- [x] **4-Step Checkout (`/checkout`):**
  - Step 1: Address form with 6-digit PIN regex validation.
  - Step 2: Delivery speed confirmation.
  - Step 3: Payment method choice (Razorpay online or Cash on Delivery).
  - Step 4: Final review with Idempotency Key protection.
- [x] **Order Confirmation Screen:** Displays order number (`ORD-2026-000101`), breakdown, and confirmation status.

### Customer Authentication & Account
- [x] **Customer Registration (`/register`):** Email validation, unique check, password complexity (min 8 chars, 1 letter, 1 number).
- [x] **Customer & Staff Login (`/login`):** HTTP-only session cookies, 5-attempt rate-limit lockout (15 minutes), guest cart auto-merging, and demo 1-click login buttons.
- [x] **Order History (`/account/orders`):** Protected route showing customer's past orders and status.

### Admin Operations & RBAC (`/admin`)
- [x] **Route Protection:** Only `STAFF`, `MANAGER`, and `SUPER_ADMIN` can access `/admin`.
- [x] **Dashboard KPIs (`/admin`):** Live Gross Revenue, Order Count, Average Order Value (AOV), Active Customers, Inventory Low-Stock Alerts, and Status Breakdown.
- [x] **Order Lifecycle Manager (`/admin/orders`):** Filter by status, search by order number, enforce state machine transitions (`CONFIRMED` ➔ `PROCESSING` ➔ `SHIPPED` ➔ `DELIVERED`), modal to assign Courier Partner & Tracking Number.
- [x] **Inventory Controller (`/admin/products`):** Real-time stock adjustment buttons (+1, +10, -1, -5) with automatic write to `inventory_ledger`.

---

## 🔑 Demo Credentials (Seeded)
| Role | Email | Password | Allowed Access |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@ripzy.com` | `Ripzy@1234` | Full access (`/admin`, staff, settings) |
| **Store Manager**| `manager@ripzy.com`| `Ripzy@1234` | Full access to products, orders, inventory |
| **Logistics Staff**| `staff@ripzy.com`| `Ripzy@1234` | Orders status update, inventory view |
| **Customer** | `customer@ripzy.com`| `Ripzy@1234` | Storefront, cart, checkout, order history |

---

## ⏭️ Next Phase Roadmap (Phase 2 & Enhancements)
When you resume work, pick up from these Phase 2 items:
1. **Customer Review Submission:** Add review form on PDP for verified buyers (1-5 stars, comments, photos) + Admin moderation queue (`/admin/reviews`).
2. **Wishlist Page (`/wishlist`):** Toggle heart icon on cards, move items between wishlist and cart.
3. **Instant Search Autocomplete:** 300ms debounced search popup in navbar with live product suggestions.
4. **GST Tax Invoice PDF Generator:** Downloadable PDF invoice for completed orders on `/account/orders`.
5. **CSV/Excel Export for Admin:** Export orders, inventory valuation, and sales reports.
6. **Homepage CMS Banners Management:** Admin interface to add/edit hero banners without touching code.

---

## ⚡ Quick Setup Instructions for Any New Machine
```bash
# 1. Clone repository and navigate to folder
cd Ripzy

# 2. Install dependencies
npm install

# 3. Initialize SQLite database and sync Prisma schema
npx prisma db push

# 4. Seed database with initial products, users, and coupons
npx tsx prisma/seed.ts

# 5. Start development server
npm run dev
# App will be live at http://localhost:3000
```
