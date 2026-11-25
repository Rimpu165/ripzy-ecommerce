/**
 * Additive, idempotent seed: a menswear catalogue (shirts, tees, trousers, jeans,
 * jackets, hoodies, suits) in the spirit of modern Indian D2C fashion stores.
 * All names/descriptions are original and brands are fictional; images are free
 * Unsplash stock photos (logo-free ones only).
 *
 * Run:  npx tsx prisma/seed-fashion.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const img = (id: string) => `https://images.unsplash.com/photo-${id}?w=900&q=80&auto=format&fit=crop`;

// verified, logo-free stock photo ids
const P = {
  denimShirt: img("1596755094514-f87e34085b2c"),
  shirtsFlat: img("1602810318383-e386cc2a3ccf"),
  shirtHanger: img("1603252109303-2751441dd157"),
  whiteTee: img("1521572163474-6864f9cf17ab"),
  blackTeeHanger: img("1583743814966-8936f5b7be1a"),
  blackTeeBadge: img("1618354691373-d851c5c3a990"),
  teeRack: img("1489987707025-afc232f7ea0f"),
  graphicTeeModel: img("1503341504253-dff4815485f1"),
  chinos: img("1473966968600-fa801b869a1a"),
  darkTrousers: img("1624378439575-d8705ad7ae80"),
  bomber: img("1591047139829-d91aecb6caea"),
  leather: img("1551028719-00167b16eac5"),
  sweatshirt: img("1620799140408-edc6dcb6d633"),
  hoodie: img("1556821840-3a63f95609a7"),
  suitNavy: img("1507679799987-c73779587ccf"),
  suitCheck: img("1594938298603-c8148c4dae35"),
};

const SIZES = ["S", "M", "L", "XL"];
const gst = (price: number) => (price <= 2500 ? 5 : 18);

interface Def {
  name: string;
  slug: string;
  category: string;
  brand: string;
  short: string;
  description: string;
  price: number;
  mrp: number;
  colors: string[];
  images: string[];
  featured?: boolean;
  code: string;
}

const CATEGORIES = [
  ["shirts", "Shirts", P.shirtsFlat],
  ["t-shirts", "T-Shirts", P.whiteTee],
  ["trousers", "Trousers & Chinos", P.chinos],
  ["jackets", "Jackets", P.bomber],
  ["hoodies", "Hoodies & Sweatshirts", P.hoodie],
  ["suits-blazers", "Suits & Blazers", P.suitNavy],
] as const;

const BRANDS = [
  ["northline", "Northline", "Modern everyday menswear built around clean cuts and breathable fabrics."],
  ["urban-thread", "Urban Thread", "Street-ready staples with relaxed fits and bold basics."],
];

const PRODUCTS: Def[] = [
  { code: "NL-SH-01", name: "Northline Printed Casual Shirt", slug: "northline-printed-casual-shirt", category: "shirts", brand: "northline",
    short: "Soft cotton-blend shirt with a subtle micro print and a relaxed, easy fit.",
    description: "A weekend-ready casual shirt cut from a soft cotton blend with a subtle micro print. Spread collar, curved hem and a relaxed fit that works tucked or untucked. Machine washable.",
    price: 1499, mrp: 2499, colors: ["Denim Blue", "Slate"], images: [P.denimShirt, P.shirtHanger], featured: true },
  { code: "NL-SH-02", name: "Northline Classic Formal Shirt", slug: "northline-classic-formal-shirt", category: "shirts", brand: "northline",
    short: "Wrinkle-resistant formal shirt in a slim fit for the office and beyond.",
    description: "Crisp, wrinkle-resistant formal shirt with a structured collar and a slim, tailored fit. Breathable cotton rich fabric keeps you comfortable through long workdays.",
    price: 1799, mrp: 2999, colors: ["White", "Sky Blue", "Burgundy"], images: [P.shirtsFlat, P.shirtHanger] },
  { code: "NL-SH-03", name: "Northline Oxford Button-Down Shirt", slug: "northline-oxford-button-down", category: "shirts", brand: "northline",
    short: "Heavyweight oxford weave with a button-down collar.",
    description: "Heavier oxford weave that softens beautifully with every wash. Button-down collar, chest pocket and a regular fit for everyday smart-casual styling.",
    price: 1999, mrp: 3299, colors: ["White", "Pale Pink"], images: [P.shirtHanger, P.shirtsFlat] },
  { code: "UT-TS-01", name: "Urban Thread Essential Crew Tee", slug: "urban-thread-essential-crew-tee", category: "t-shirts", brand: "urban-thread",
    short: "240 GSM combed cotton crew-neck tee with a clean, boxy drape.",
    description: "Your everyday tee, upgraded. 240 GSM combed cotton with a ribbed crew neck and a clean, slightly boxy drape that holds its shape wash after wash.",
    price: 699, mrp: 1199, colors: ["White", "Black", "Olive"], images: [P.whiteTee, P.teeRack], featured: true },
  { code: "UT-TS-02", name: "Urban Thread Oversized Graphic Tee", slug: "urban-thread-oversized-graphic-tee", category: "t-shirts", brand: "urban-thread",
    short: "Drop-shoulder oversized tee with a minimal chest graphic.",
    description: "Oversized fit with dropped shoulders and a minimal chest graphic. Made from breathable 220 GSM cotton jersey for an easy, street-ready look.",
    price: 899, mrp: 1499, colors: ["Black", "Off White"], images: [P.graphicTeeModel, P.blackTeeHanger], featured: true },
  { code: "UT-TS-03", name: "Urban Thread Badge Logo Tee", slug: "urban-thread-badge-logo-tee", category: "t-shirts", brand: "urban-thread",
    short: "Regular-fit tee with a small embroidered badge on the chest.",
    description: "Regular-fit cotton tee with a small embroidered badge on the chest. Pre-shrunk and garment-washed for a lived-in feel from day one.",
    price: 799, mrp: 1299, colors: ["Black", "Charcoal"], images: [P.blackTeeBadge, P.blackTeeHanger] },
  { code: "NL-TR-01", name: "Northline Stretch Chinos", slug: "northline-stretch-chinos", category: "trousers", brand: "northline",
    short: "Slim-tapered chinos with two-way stretch for all-day comfort.",
    description: "Slim-tapered chinos in a cotton-elastane twill with two-way stretch. Mid-rise waist, clean front and a tapered leg that pairs with sneakers or loafers.",
    price: 1899, mrp: 2999, colors: ["Khaki", "Navy", "Olive"], images: [P.chinos, P.darkTrousers], featured: true },
  { code: "NL-TR-02", name: "Northline Tailored Trousers", slug: "northline-tailored-trousers", category: "trousers", brand: "northline",
    short: "Flat-front tailored trousers in a smooth, drapey fabric.",
    description: "Flat-front tailored trousers with a clean drape and a comfortable mid-rise. Hidden hook closure and side adjusters for a sharp, secure fit.",
    price: 2299, mrp: 3799, colors: ["Navy", "Charcoal"], images: [P.darkTrousers, P.chinos] },
  { code: "UT-JK-01", name: "Urban Thread Satin Bomber Jacket", slug: "urban-thread-satin-bomber-jacket", category: "jackets", brand: "urban-thread",
    short: "Lightweight satin-finish bomber with ribbed trims and zip pockets.",
    description: "Lightweight bomber with a smooth satin finish, ribbed collar, cuffs and hem, and zip sleeve pocket. Quilt-lined body for mild evenings.",
    price: 3499, mrp: 5999, colors: ["Rust", "Olive", "Black"], images: [P.bomber, P.leather], featured: true },
  { code: "UT-JK-02", name: "Urban Thread Faux Leather Biker Jacket", slug: "urban-thread-faux-leather-biker-jacket", category: "jackets", brand: "urban-thread",
    short: "Statement biker jacket in soft, vegan leather.",
    description: "Classic biker silhouette in soft vegan leather with an asymmetric zip, notch collar and zip pockets. Smooth satin lining for easy layering.",
    price: 4999, mrp: 8499, colors: ["Black"], images: [P.leather, P.bomber] },
  { code: "UT-HD-01", name: "Urban Thread Heavyweight Hoodie", slug: "urban-thread-heavyweight-hoodie", category: "hoodies", brand: "urban-thread",
    short: "380 GSM brushed-fleece pullover hoodie with a roomy kangaroo pocket.",
    description: "Cosy 380 GSM brushed-fleece hoodie with a double-layer hood, kangaroo pocket and ribbed cuffs. Relaxed fit that layers well in cooler weather.",
    price: 2199, mrp: 3499, colors: ["Heather Grey", "Black", "Navy"], images: [P.hoodie, P.sweatshirt], featured: true },
  { code: "NL-SW-01", name: "Northline Crew Neck Sweatshirt", slug: "northline-crew-neck-sweatshirt", category: "hoodies", brand: "northline",
    short: "Soft terry crew-neck sweatshirt with a clean, minimal finish.",
    description: "Soft French-terry crew-neck sweatshirt with ribbed cuffs and hem. A minimal everyday layer in a regular fit.",
    price: 1699, mrp: 2799, colors: ["Off White", "Black"], images: [P.sweatshirt, P.hoodie] },
  { code: "NL-SB-01", name: "Northline Navy Two-Piece Suit", slug: "northline-navy-two-piece-suit", category: "suits-blazers", brand: "northline",
    short: "Slim-fit two-piece suit in a wrinkle-resistant poly-viscose blend.",
    description: "Tailored two-piece suit in a wrinkle-resistant poly-viscose blend. Single-breasted, notch lapel, flat-front trousers. Ideal for interviews, weddings and boardrooms.",
    price: 8999, mrp: 14999, colors: ["Navy"], images: [P.suitNavy, P.suitCheck] },
  { code: "NL-SB-02", name: "Northline Check Three-Piece Suit", slug: "northline-check-three-piece-suit", category: "suits-blazers", brand: "northline",
    short: "Window-pane check three-piece with waistcoat for festive occasions.",
    description: "Statement window-pane check suit with matching waistcoat and trousers. Structured shoulders and a slim fit for a polished, celebration-ready look.",
    price: 11999, mrp: 19999, colors: ["Blue Check"], images: [P.suitCheck, P.suitNavy] },
];

const COLOR_CODE: Record<string, string> = {
  "Denim Blue": "DNB", Slate: "SLT", White: "WHT", "Sky Blue": "SKY", Burgundy: "BRG", "Pale Pink": "PNK",
  Black: "BLK", Olive: "OLV", "Off White": "OFW", Charcoal: "CHR", Khaki: "KHK", Navy: "NVY", Rust: "RST",
  "Heather Grey": "HGR", "Blue Check": "BCK",
};

async function main() {
  console.log("Seeding menswear catalogue…");

  const catId: Record<string, string> = {};
  let order = 10;
  for (const [slug, name, image] of CATEGORIES) {
    const c = await prisma.category.upsert({
      where: { slug },
      update: {},
      create: { slug, name, image, level: 1, sortOrder: order++, isActive: true, description: `${name} for men` },
    });
    catId[slug] = c.id;
  }

  const brandId: Record<string, string> = {};
  for (const [slug, name, description] of BRANDS) {
    const b = await prisma.brand.upsert({ where: { slug }, update: {}, create: { slug, name, description } });
    brandId[slug] = b.id;
  }

  let created = 0;
  for (const d of PRODUCTS) {
    if (await prisma.product.findUnique({ where: { slug: d.slug } })) continue;

    const variants = d.colors.flatMap((color) =>
      SIZES.map((size, i) => ({
        sku: `${d.code}-${COLOR_CODE[color] ?? color.slice(0, 3).toUpperCase()}-${size}`,
        title: `${color} / ${size}`,
        price: d.price,
        compareAtPrice: d.mrp,
        stock: 12 + ((d.code.length * 7 + i * 9 + color.length * 5) % 28),
        lowStockThreshold: 5,
        attributes: JSON.stringify({ color, size }),
      }))
    );

    await prisma.product.create({
      data: {
        name: d.name,
        slug: d.slug,
        description: d.description,
        shortDescription: d.short,
        brandId: brandId[d.brand],
        categoryId: catId[d.category],
        taxRate: gst(d.price),
        status: "ACTIVE",
        isFeatured: !!d.featured,
        metaTitle: `${d.name} | Ripzy`,
        metaDescription: d.short,
        variants: { create: variants },
        images: {
          create: d.images.map((url, i) => ({ url, altText: d.name, sortOrder: i, isPrimary: i === 0 })),
        },
      },
    });
    created++;
  }

  // Homepage banners for the menswear drop (skipped if already present)
  const banners = [
    { title: "The Everyday Tee Edit", subtitle: "Premium 240 GSM cotton basics from ₹699.", badge: "NEW DROP", imageUrl: img("1489987707025-afc232f7ea0f").replace("w=900", "w=1600"), linkUrl: "/products?category=t-shirts", sortOrder: -2 },
    { title: "Sharp. Tailored. Ready.", subtitle: "Shirts, chinos and suits for every occasion.", badge: "MENSWEAR", imageUrl: img("1507679799987-c73779587ccf").replace("w=900", "w=1600"), linkUrl: "/products?category=suits-blazers", sortOrder: -1 },
  ];
  for (const b of banners) {
    if (!(await prisma.banner.findFirst({ where: { title: b.title } }))) await prisma.banner.create({ data: { ...b, isActive: true } });
  }

  console.log(`✅ Menswear seed done — ${created} new products (${PRODUCTS.length - created} already existed).`);
}

main()
  .catch((e) => {
    console.error("❌ Fashion seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
