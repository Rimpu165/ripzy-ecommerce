import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";

/** Revenue only counts these statuses. */
export const REVENUE_STATUSES = ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"];

export type RangeKey = "today" | "7d" | "30d" | "90d" | "12m";
export const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "90d", label: "90d" },
  { key: "12m", label: "12m" },
];
export const parseRange = (v: string | undefined): RangeKey =>
  RANGE_OPTIONS.some((r) => r.key === v) ? (v as RangeKey) : "30d";

const IST = 19800000; // store reports in IST (UTC+5:30)
const HOUR = 3600000;
const DAY = 24 * HOUR;

const parts = (t: number) => {
  const d = new Date(t + IST);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), dow: d.getUTCDay(), h: d.getUTCHours() };
};
const istMidnight = (t: number) => Math.floor((t + IST) / DAY) * DAY - IST;
const monthStart = (y: number, m: number) => Date.UTC(y, m, 1) - IST;

type Kind = "hour" | "day" | "month";
export interface RangeInfo {
  key: RangeKey;
  kind: Kind;
  n: number;
  start: number;
  end: number;
  prevStart: number;
  labels: string[];
  title: string;
  prevTitle: string;
}

function resolveRange(key: RangeKey, now: number): RangeInfo {
  let kind: Kind = "day";
  let n = 30;
  let start: number, end: number, prevStart: number;
  if (key === "today") {
    kind = "hour"; n = 24;
    start = istMidnight(now); end = start + DAY; prevStart = start - DAY;
  } else if (key === "12m") {
    kind = "month"; n = 12;
    const p = parts(now);
    start = monthStart(p.y, p.m - 11); end = monthStart(p.y, p.m + 1); prevStart = monthStart(p.y, p.m - 23);
  } else {
    n = key === "7d" ? 7 : key === "90d" ? 90 : 30;
    start = istMidnight(now) - (n - 1) * DAY; end = start + n * DAY; prevStart = start - n * DAY;
  }
  const labels: string[] = [];
  for (let i = 0; i < n; i++) {
    if (kind === "hour") labels.push(`${i % 12 || 12}${i < 12 ? "am" : "pm"}`);
    else if (kind === "day") labels.push(new Date(start + i * DAY + IST).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }));
    else {
      const p = parts(start);
      labels.push(new Date(monthStart(p.y, p.m + i) + IST).toLocaleDateString("en-IN", { month: "short", year: "2-digit", timeZone: "UTC" }));
    }
  }
  const titles: Record<RangeKey, [string, string]> = {
    today: ["Today", "yesterday"],
    "7d": ["Last 7 days", "previous 7 days"],
    "30d": ["Last 30 days", "previous 30 days"],
    "90d": ["Last 90 days", "previous 90 days"],
    "12m": ["Last 12 months", "previous 12 months"],
  };
  return { key, kind, n, start, end, prevStart, labels, title: titles[key][0], prevTitle: titles[key][1] };
}

function bucketIndex(r: RangeInfo, t: number, base: number): number {
  if (r.kind === "hour") return Math.floor((t - base) / HOUR);
  if (r.kind === "day") return Math.floor((t - base) / DAY);
  const a = parts(t), b = parts(base);
  return (a.y * 12 + a.m) - (b.y * 12 + b.m);
}

function series<T>(r: RangeInfo, rows: T[], time: (x: T) => number, val: (x: T) => number, base: number): number[] {
  const out = new Array<number>(r.n).fill(0);
  for (const row of rows) {
    const i = bucketIndex(r, time(row), base);
    if (i >= 0 && i < r.n) out[i] += val(row);
  }
  return out;
}
const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);

function parseAddress(json: string): { city?: string; state?: string } {
  try {
    const a = JSON.parse(json);
    const t = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
    return { city: t(a?.city), state: t(a?.state) };
  } catch {
    return {};
  }
}

function topN<T extends { value: number }>(m: Map<string, T>, n: number) {
  return [...m.entries()].sort((a, b) => b[1].value - a[1].value).slice(0, n);
}

const empty = <T,>(v: T) => Promise.resolve(v);

export async function getDashboardData(role: string, rangeKey: RangeKey) {
  const nowMs = Date.now();
  const r = resolveRange(rangeKey, nowMs);
  const startD = new Date(r.start), endD = new Date(r.end), prevStartD = new Date(r.prevStart);

  const perms = {
    orders: can(role, "orders.view"),
    money: can(role, "reports.view") && can(role, "orders.view"),
    stock: can(role, "inventory.view"),
    reviews: can(role, "reviews.moderate"),
    returns: can(role, "returns.manage"),
    customers: can(role, "customers.view"),
    coupons: can(role, "coupons.manage"),
    audit: can(role, "audit.view"),
    products: can(role, "products.manage"),
    reports: can(role, "reports.view"),
  };

  const inRange = { gte: startD, lt: endD };
  const weekAgo = new Date(nowMs - 7 * DAY);
  const thirtyMinAgo = new Date(nowMs - 30 * 60 * 1000);

  const [
    orders, users, refunds, returnsInRange, orderItems, variants,
    toShip, pendingOld, returnsOpen, reviewsPending, failedPayments, refundsInitiated,
    recent, audit, couponUsage, ratingGroups, anyOrder,
  ] = await Promise.all([
    perms.orders
      ? prisma.order.findMany({
          where: { createdAt: { gte: prevStartD, lt: endD } },
          select: {
            createdAt: true, grandTotal: true, status: true, userId: true, shippingAddressJson: true,
            payments: { select: { paymentMethod: true }, take: 1, orderBy: { createdAt: "asc" } },
          },
        })
      : empty([]),
    perms.customers
      ? prisma.user.findMany({ where: { role: "CUSTOMER", deletedAt: null, createdAt: { gte: prevStartD, lt: endD } }, select: { createdAt: true } })
      : empty([]),
    perms.money
      ? prisma.refund.findMany({ where: { createdAt: { gte: prevStartD, lt: endD }, status: { not: "FAILED" } }, select: { createdAt: true, amount: true } })
      : empty([]),
    perms.money ? prisma.returnRequest.count({ where: { createdAt: inRange } }) : empty(0),
    perms.money
      ? prisma.orderItem.findMany({
          where: { order: { status: { in: REVENUE_STATUSES }, createdAt: inRange } },
          select: {
            productName: true, quantity: true, totalPrice: true,
            variant: { select: { product: { select: { id: true, category: { select: { name: true } } } } } },
          },
        })
      : empty([]),
    perms.stock
      ? prisma.productVariant.findMany({
          where: { product: { deletedAt: null } },
          select: { id: true, sku: true, title: true, stock: true, price: true, lowStockThreshold: true, product: { select: { id: true, name: true } } },
        })
      : empty([]),
    perms.orders ? prisma.order.count({ where: { status: { in: ["CONFIRMED", "PROCESSING"] } } }) : empty(0),
    perms.orders ? prisma.order.count({ where: { status: "PENDING_PAYMENT", createdAt: { lt: thirtyMinAgo } } }) : empty(0),
    perms.returns ? prisma.returnRequest.count({ where: { status: "REQUESTED" } }) : empty(0),
    perms.reviews ? prisma.review.count({ where: { status: "PENDING" } }) : empty(0),
    perms.money ? prisma.payment.count({ where: { status: "FAILED", createdAt: { gte: weekAgo } } }) : empty(0),
    perms.money ? prisma.refund.count({ where: { status: "INITIATED" } }) : empty(0),
    perms.orders
      ? prisma.order.findMany({
          orderBy: { createdAt: "desc" }, take: 8,
          select: { id: true, orderNumber: true, status: true, grandTotal: true, createdAt: true, user: { select: { name: true } } },
        })
      : empty([]),
    perms.audit
      ? prisma.auditLog.findMany({
          orderBy: { createdAt: "desc" }, take: 10,
          select: { id: true, action: true, entityType: true, entityId: true, createdAt: true, user: { select: { name: true } } },
        })
      : empty([]),
    perms.coupons
      ? prisma.couponUsage.findMany({ where: { usedAt: inRange }, select: { discountAmount: true, coupon: { select: { code: true } } } })
      : empty([]),
    perms.reviews ? prisma.review.groupBy({ by: ["rating"], where: { status: "APPROVED" }, _count: { _all: true } }) : empty([]),
    perms.orders ? prisma.order.count() : empty(0),
  ]);

  // ---- order based metrics ----
  const curOrders = orders.filter((o) => o.createdAt.getTime() >= r.start);
  const prevOrders = orders.filter((o) => o.createdAt.getTime() < r.start);
  const isPaid = (o: { status: string }) => REVENUE_STATUSES.includes(o.status);
  const curPaid = curOrders.filter(isPaid), prevPaid = prevOrders.filter(isPaid);

  const t = (o: { createdAt: Date }) => o.createdAt.getTime();
  const revCur = series(r, curPaid, t, (o) => o.grandTotal, r.start);
  const revPrev = series(r, prevPaid, t, (o) => o.grandTotal, r.prevStart);
  const ordCur = series(r, curPaid, t, () => 1, r.start);
  const ordPrev = series(r, prevPaid, t, () => 1, r.prevStart);
  const createdCur = series(r, curOrders, t, () => 1, r.start);
  const createdPrev = series(r, prevOrders, t, () => 1, r.prevStart);

  const revenue = sum(revCur), prevRevenue = sum(revPrev);
  const aovSpark = revCur.map((v, i) => (ordCur[i] ? v / ordCur[i] : 0));
  const custCur = series(r, users.filter((u) => u.createdAt.getTime() >= r.start), t, () => 1, r.start);
  const custPrev = series(r, users.filter((u) => u.createdAt.getTime() < r.start), t, () => 1, r.prevStart);
  const convSpark = createdCur.map((c, i) => (c ? (ordCur[i] / c) * 100 : 0));
  const refCur = series(r, refunds.filter((x) => x.createdAt.getTime() >= r.start), t, (x) => x.amount, r.start);
  const refPrev = series(r, refunds.filter((x) => x.createdAt.getTime() < r.start), t, (x) => x.amount, r.prevStart);

  const kpis = {
    revenue: { cur: revenue, prev: prevRevenue, spark: revCur },
    orders: { cur: curPaid.length, prev: prevPaid.length, spark: ordCur },
    aov: { cur: curPaid.length ? revenue / curPaid.length : 0, prev: prevPaid.length ? prevRevenue / prevPaid.length : 0, spark: aovSpark },
    customers: { cur: sum(custCur), prev: sum(custPrev), spark: custCur },
    conversion: {
      cur: curOrders.length ? (curPaid.length / curOrders.length) * 100 : 0,
      prev: prevOrders.length ? (prevPaid.length / prevOrders.length) * 100 : 0,
      spark: convSpark,
      created: curOrders.length,
    },
    refunds: { cur: sum(refCur), prev: sum(refPrev), spark: refCur, returns: returnsInRange },
  };

  const trend = r.labels.map((label, i) => ({
    label, revenue: Math.round(revCur[i]), orders: ordCur[i], prevRevenue: Math.round(revPrev[i]), prevOrders: ordPrev[i],
  }));

  // ---- pipeline ----
  const statusCount: Record<string, number> = {};
  for (const o of curOrders) statusCount[o.status] = (statusCount[o.status] || 0) + 1;

  // ---- payment split, geography, heat ----
  let cod = 0, online = 0;
  const states = new Map<string, { value: number }>();
  const cities = new Map<string, { value: number }>();
  const heat: number[][] = Array.from({ length: 7 }, () => new Array<number>(24).fill(0));
  for (const o of curOrders) {
    const p = parts(o.createdAt.getTime());
    heat[p.dow][p.h]++;
    if (!isPaid(o)) continue;
    if (o.payments[0]?.paymentMethod === "COD") cod++;
    else if (o.payments[0]) online++;
    const a = parseAddress(o.shippingAddressJson);
    if (a.state) states.set(a.state, { value: (states.get(a.state)?.value ?? 0) + 1 });
    if (a.city) cities.set(a.city, { value: (cities.get(a.city)?.value ?? 0) + 1 });
  }

  // ---- products / categories ----
  const prodMap = new Map<string, { name: string; productId?: string; units: number; revenue: number }>();
  const catMap = new Map<string, { value: number }>();
  for (const it of orderItems) {
    const pid = it.variant?.product.id;
    const key = pid ?? `n:${it.productName}`;
    const e = prodMap.get(key) ?? { name: it.productName, productId: pid, units: 0, revenue: 0 };
    e.units += it.quantity; e.revenue += it.totalPrice;
    prodMap.set(key, e);
    const cat = it.variant?.product.category?.name ?? "Uncategorised";
    catMap.set(cat, { value: (catMap.get(cat)?.value ?? 0) + it.totalPrice });
  }
  const topProductsRaw = [...prodMap.values()].sort((a, b) => b.units - a.units).slice(0, 6);
  const stockByProduct = new Map<string, number>();
  for (const v of variants) stockByProduct.set(v.product.id, (stockByProduct.get(v.product.id) ?? 0) + v.stock);
  const topProducts = topProductsRaw.map((p) => ({ ...p, stockLeft: p.productId && perms.stock ? stockByProduct.get(p.productId) ?? null : null }));
  const categories = topN(catMap, 6).map(([label, v]) => ({ label, value: Math.round(v.value) }));

  // ---- top customers (needs a name lookup) ----
  const spend = new Map<string, { value: number; orders: number }>();
  if (perms.money) {
    for (const o of curPaid) {
      if (!o.userId) continue;
      const e = spend.get(o.userId) ?? { value: 0, orders: 0 };
      e.value += o.grandTotal; e.orders++;
      spend.set(o.userId, e);
    }
  }
  const topSpend = topN(spend, 5);
  const names = topSpend.length
    ? await prisma.user.findMany({ where: { id: { in: topSpend.map(([id]) => id) } }, select: { id: true, name: true, email: true } })
    : [];
  const topCustomers = topSpend.map(([id, v]) => {
    const u = names.find((x) => x.id === id);
    return { id, name: u?.name ?? "Customer", email: u?.email ?? "", spend: v.value, orders: v.orders };
  });

  // ---- inventory ----
  const out = variants.filter((v) => v.stock <= 0).sort((a, b) => a.sku.localeCompare(b.sku));
  const low = variants.filter((v) => v.stock > 0 && v.stock <= v.lowStockThreshold).sort((a, b) => a.stock / a.lowStockThreshold - b.stock / b.lowStockThreshold);
  const inventory = {
    totalVariants: variants.length,
    units: variants.reduce((s, v) => s + Math.max(0, v.stock), 0),
    value: variants.reduce((s, v) => s + Math.max(0, v.stock) * v.price, 0),
    outCount: out.length,
    lowCount: low.length,
    out: out.slice(0, 5),
    low: low.slice(0, 6),
  };

  // ---- coupons ----
  const cMap = new Map<string, { value: number; discount: number }>();
  for (const u of couponUsage) {
    const e = cMap.get(u.coupon.code) ?? { value: 0, discount: 0 };
    e.value++; e.discount += u.discountAmount;
    cMap.set(u.coupon.code, e);
  }
  const coupons = topN(cMap, 5).map(([code, v]) => ({ code, uses: v.value, discount: v.discount }));
  const couponTotals = { uses: couponUsage.length, discount: couponUsage.reduce((s, u) => s + u.discountAmount, 0) };

  // ---- reviews ----
  const dist = [5, 4, 3, 2, 1].map((star) => ({ star, count: ratingGroups.find((g) => g.rating === star)?._count._all ?? 0 }));
  const reviewCount = dist.reduce((s, d) => s + d.count, 0);
  const reviews = {
    count: reviewCount,
    avg: reviewCount ? dist.reduce((s, d) => s + d.star * d.count, 0) / reviewCount : 0,
    dist,
  };

  return {
    nowMs, range: r, perms, kpis, trend,
    pipeline: statusCount,
    totalCreated: curOrders.length,
    payment: { cod, online },
    states: topN(states, 5).map(([label, v]) => ({ label, value: v.value })),
    cities: topN(cities, 5).map(([label, v]) => ({ label, value: v.value })),
    heat,
    categories, topProducts, topCustomers, inventory,
    actions: { toShip, pendingOld, returnsOpen, reviewsPending, failedPayments, refundsInitiated },
    recent, audit, coupons, couponTotals, reviews,
    storeHasOrders: anyOrder > 0 || orders.length > 0,
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
