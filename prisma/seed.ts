import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Ripzy database...");

  // 1. Settings
  const settings = [
    { key: "store_name", value: "Ripzy", description: "Store brand name" },
    { key: "support_email", value: "support@ripzy.com", description: "Customer care email" },
    { key: "support_phone", value: "+91 98765 43210", description: "Customer care phone" },
    { key: "currency", value: "INR", description: "Base store currency" },
    { key: "currency_symbol", value: "₹", description: "Currency symbol" },
    { key: "free_shipping_threshold", value: "999", description: "Min amount for free shipping" },
    { key: "standard_shipping_fee", value: "99", description: "Default shipping charge" },
    { key: "return_window_days", value: "7", description: "Return request window in days" },
    { key: "cod_enabled", value: "true", description: "Cash on delivery allowed" },
    { key: "default_tax_rate", value: "18", description: "Standard GST percentage" },
  ];

  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }

  // 2. Users (Admin, Manager, Staff, Customer)
  const defaultPassword = await bcrypt.hash("Ripzy@1234", 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@ripzy.com" },
    update: {},
    create: {
      email: "admin@ripzy.com",
      name: "Devendra Super Admin",
      passwordHash: defaultPassword,
      role: "SUPER_ADMIN",
      phone: "+91 98000 00001",
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: "manager@ripzy.com" },
    update: {},
    create: {
      email: "manager@ripzy.com",
      name: "Pooja Store Manager",
      passwordHash: defaultPassword,
      role: "MANAGER",
      phone: "+91 98000 00002",
    },
  });

  const staff = await prisma.user.upsert({
    where: { email: "staff@ripzy.com" },
    update: {},
    create: {
      email: "staff@ripzy.com",
      name: "Aman Logistics Staff",
      passwordHash: defaultPassword,
      role: "STAFF",
      phone: "+91 98000 00003",
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: "customer@ripzy.com" },
    update: {},
    create: {
      email: "customer@ripzy.com",
      name: "Rahul Sharma",
      passwordHash: defaultPassword,
      role: "CUSTOMER",
      phone: "+91 98765 00123",
      addresses: {
        create: {
          fullName: "Rahul Sharma",
          phone: "+91 98765 00123",
          addressLine1: "Flat 402, High-Tech Residency",
          addressLine2: "Linking Road, Bandra West",
          city: "Mumbai",
          state: "Maharashtra",
          postalCode: "400050",
          isDefault: true,
        },
      },
    },
  });

  // 3. Categories
  const catElectronics = await prisma.category.upsert({
    where: { slug: "electronics" },
    update: {},
    create: {
      name: "Electronics",
      slug: "electronics",
      description: "Cutting-edge consumer tech, audio, and personal gadgets",
      level: 1,
      sortOrder: 1,
    },
  });

  const catAudio = await prisma.category.upsert({
    where: { slug: "audio" },
    update: {},
    create: {
      name: "Audio & Headphones",
      slug: "audio",
      description: "Audiophile-grade wireless earbuds, headphones & soundbars",
      parentId: catElectronics.id,
      level: 2,
      sortOrder: 1,
    },
  });

  const catWorkspaces = await prisma.category.upsert({
    where: { slug: "workspace" },
    update: {},
    create: {
      name: "Workspace & Keyboards",
      slug: "workspace",
      description: "Ergonomic keyboards, desk pads, and productivity tools",
      parentId: catElectronics.id,
      level: 2,
      sortOrder: 2,
    },
  });

  const catWearables = await prisma.category.upsert({
    where: { slug: "wearables" },
    update: {},
    create: {
      name: "Smart Wearables",
      slug: "wearables",
      description: "Smartwatches, fitness bands, and futuristic eyewear",
      parentId: catElectronics.id,
      level: 2,
      sortOrder: 3,
    },
  });

  // 4. Brands
  const brandSony = await prisma.brand.upsert({
    where: { slug: "sony" },
    update: {},
    create: { name: "Sony", slug: "sony", description: "For the music lovers" },
  });

  const brandApple = await prisma.brand.upsert({
    where: { slug: "apple" },
    update: {},
    create: { name: "Apple", slug: "apple", description: "Think different" },
  });

  const brandKeychron = await prisma.brand.upsert({
    where: { slug: "keychron" },
    update: {},
    create: { name: "Keychron", slug: "keychron", description: "Premium wireless mechanical keyboards" },
  });

  const brandNothing = await prisma.brand.upsert({
    where: { slug: "nothing" },
    update: {},
    create: { name: "Nothing", slug: "nothing", description: "Pure transparent engineering" },
  });

  // 5. Products & Variants
  const p1 = await prisma.product.upsert({
    where: { slug: "sony-wh-1000xm5" },
    update: {},
    create: {
      name: "Sony WH-1000XM5 Wireless Noise Cancelling Headphones",
      slug: "sony-wh-1000xm5",
      description:
        "The Sony WH-1000XM5 headphones rewrite the rules for distraction-free listening. Two processors control 8 microphones for unprecedented noise cancellation. Auto NC Optimizer automatically optimizes sound based on wearing conditions.",
      shortDescription: "Industry-leading noise cancelling with 2 processors, 8 microphones and 30-hour battery life.",
      brandId: brandSony.id,
      categoryId: catAudio.id,
      taxRate: 18.0,
      isFeatured: true,
      variants: {
        create: [
          {
            sku: "SNY-XM5-BLK",
            title: "Midnight Black",
            price: 29990,
            compareAtPrice: 34990,
            stock: 25,
            lowStockThreshold: 5,
            attributes: JSON.stringify({ color: "Black" }),
          },
          {
            sku: "SNY-XM5-SLV",
            title: "Platinum Silver",
            price: 29990,
            compareAtPrice: 34990,
            stock: 14,
            lowStockThreshold: 5,
            attributes: JSON.stringify({ color: "Silver" }),
          },
        ],
      },
      images: {
        create: [
          {
            url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80",
            altText: "Sony WH-1000XM5 Black front view",
            isPrimary: true,
            sortOrder: 0,
          },
          {
            url: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800&q=80",
            altText: "Sony WH-1000XM5 angle shot",
            isPrimary: false,
            sortOrder: 1,
          },
        ],
      },
    },
  });

  const p2 = await prisma.product.upsert({
    where: { slug: "apple-airpods-pro-2" },
    update: {},
    create: {
      name: "Apple AirPods Pro (2nd Gen) with MagSafe Case (USB-C)",
      slug: "apple-airpods-pro-2",
      description:
        "AirPods Pro feature up to 2x more Active Noise Cancellation, plus Adaptive Audio and Transparency mode. Next-level spatial audio immerses you in music. Up to 6 hours of listening time on a single charge.",
      shortDescription: "Up to 2x more Active Noise Cancellation with H2 chip and USB-C MagSafe charging case.",
      brandId: brandApple.id,
      categoryId: catAudio.id,
      taxRate: 18.0,
      isFeatured: true,
      variants: {
        create: [
          {
            sku: "APL-APP2-USBC",
            title: "Standard White",
            price: 22900,
            compareAtPrice: 24900,
            stock: 40,
            lowStockThreshold: 8,
            attributes: JSON.stringify({ color: "White" }),
          },
        ],
      },
      images: {
        create: [
          {
            url: "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800&q=80",
            altText: "Apple AirPods Pro 2 in case",
            isPrimary: true,
            sortOrder: 0,
          },
        ],
      },
    },
  });

  const p3 = await prisma.product.upsert({
    where: { slug: "keychron-q1-pro-wireless" },
    update: {},
    create: {
      name: "Keychron Q1 Pro QMK/VIA Wireless Custom Mechanical Keyboard",
      slug: "keychron-q1-pro-wireless",
      description:
        "The Keychron Q1 Pro is a groundbreaking full metal wireless custom mechanical keyboard. Along with our signature premium build, CNC machined aluminum body, and double-gasket design, it offers Bluetooth 5.1 and wired connectivity.",
      shortDescription: "75% layout custom wireless mechanical keyboard with full CNC aluminum body and hot-swappable switches.",
      brandId: brandKeychron.id,
      categoryId: catWorkspaces.id,
      taxRate: 18.0,
      isFeatured: true,
      variants: {
        create: [
          {
            sku: "KEY-Q1P-RED",
            title: "Carbon Black / K Pro Red (Linear)",
            price: 17499,
            compareAtPrice: 19999,
            stock: 12,
            lowStockThreshold: 3,
            attributes: JSON.stringify({ color: "Carbon Black", switch: "Red Linear" }),
          },
          {
            sku: "KEY-Q1P-BRN",
            title: "Silver Grey / K Pro Brown (Tactile)",
            price: 17499,
            compareAtPrice: 19999,
            stock: 8,
            lowStockThreshold: 3,
            attributes: JSON.stringify({ color: "Silver Grey", switch: "Brown Tactile" }),
          },
        ],
      },
      images: {
        create: [
          {
            url: "https://images.unsplash.com/photo-1595225476474-87563907a212?w=800&q=80",
            altText: "Keychron mechanical keyboard close up",
            isPrimary: true,
            sortOrder: 0,
          },
        ],
      },
    },
  });

  const p4 = await prisma.product.upsert({
    where: { slug: "nothing-phone-2" },
    update: {},
    create: {
      name: "Nothing Phone (2) 5G Smartphone",
      slug: "nothing-phone-2",
      description:
        "Meet Nothing Phone (2). Featuring the iconic Glyph Interface, flagship Snapdragon 8+ Gen 1 chip, dual 50MP Sony camera system, and clean Nothing OS 2.5 with zero bloatware.",
      shortDescription: "Iconic Glyph interface with Snapdragon 8+ Gen 1, 6.7-inch 120Hz LTPO OLED display.",
      brandId: brandNothing.id,
      categoryId: catElectronics.id,
      taxRate: 18.0,
      isFeatured: true,
      variants: {
        create: [
          {
            sku: "NOT-PH2-12-256-GRY",
            title: "Dark Grey / 12GB RAM + 256GB",
            price: 36999,
            compareAtPrice: 44999,
            stock: 18,
            lowStockThreshold: 4,
            attributes: JSON.stringify({ color: "Dark Grey", storage: "256GB" }),
          },
          {
            sku: "NOT-PH2-12-512-WHT",
            title: "White / 12GB RAM + 512GB",
            price: 41999,
            compareAtPrice: 49999,
            stock: 10,
            lowStockThreshold: 4,
            attributes: JSON.stringify({ color: "White", storage: "512GB" }),
          },
        ],
      },
      images: {
        create: [
          {
            url: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80",
            altText: "Modern smartphone showcase",
            isPrimary: true,
            sortOrder: 0,
          },
        ],
      },
    },
  });

  // 6. Promotional Banners (FR-CMS-01, FR-HOME-01)
  await prisma.banner.createMany({
    data: [
      {
        title: "Immerse in Pure Sound",
        subtitle: "Experience flagship active noise cancellation with the new Sony & Apple collections.",
        badge: "NEW ARRIVAL",
        imageUrl: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=1600&q=80",
        linkUrl: "/products/sony-wh-1000xm5",
        sortOrder: 1,
      },
      {
        title: "Tactile Precision for Developers",
        subtitle: "Keychron custom CNC mechanical keyboards with hot-swappable switches.",
        badge: "TRENDING NOW",
        imageUrl: "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=1600&q=80",
        linkUrl: "/products/keychron-q1-pro-wireless",
        sortOrder: 2,
      },
    ],
  });

  // 7. Coupons (FR-PROMO-01)
  await prisma.coupon.upsert({
    where: { code: "RIPZY10" },
    update: {},
    create: {
      code: "RIPZY10",
      description: "10% Instant Discount on orders above ₹1,499",
      discountType: "PERCENTAGE",
      discountValue: 10,
      minOrderAmount: 1499,
      maxDiscountAmount: 1000,
      usageLimitTotal: 1000,
      usageLimitPerUser: 1,
    },
  });

  await prisma.coupon.upsert({
    where: { code: "WELCOME500" },
    update: {},
    create: {
      code: "WELCOME500",
      description: "Flat ₹500 off on order above ₹2,999",
      discountType: "FIXED",
      discountValue: 500,
      minOrderAmount: 2999,
      usageLimitTotal: 500,
      usageLimitPerUser: 1,
    },
  });

  console.log("✅ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
