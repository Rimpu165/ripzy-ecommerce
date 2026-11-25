import type { Coupon, Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { getSettings } from "./settings";
import { handleStockChange } from "./stock-alerts";

/** Public, server-authoritative commerce configuration (safe to send to the browser). */
export interface CommerceConfig {
  freeShippingThreshold: number;
  flatFee: number;
  returnWindowDays: number;
  stockReservationMinutes: number;
  codEnabled: boolean;
  codMaxAmount: number;
  maintenance: boolean;
}

function num(v: string, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export async function getCommerceConfig(): Promise<CommerceConfig> {
  const s = await getSettings();
  return {
    freeShippingThreshold: num(s["shipping.freeThreshold"], 999),
    flatFee: num(s["shipping.flatFee"], 79),
    returnWindowDays: num(s["order.returnWindowDays"], 7),
    stockReservationMinutes: Math.max(1, num(s["order.stockReservationMinutes"], 15)),
    codEnabled: s["order.codEnabled"] === "true",
    codMaxAmount: num(s["order.codMaxAmount"], 50000),
    maintenance: s["maintenance.enabled"] === "true",
  };
}

type CouponCheckDb = Pick<typeof prisma, "couponUsage">;

/** Returns a human-readable reason if the coupon cannot be used right now, else null. */
export async function couponProblem(
  coupon: Coupon | null,
  userId: string | null | undefined,
  db: CouponCheckDb = prisma
): Promise<string | null> {
  if (!coupon || !coupon.isActive) return "Invalid or inactive coupon code.";
  const now = new Date();
  if (coupon.startsAt && now < coupon.startsAt) return "This coupon is not active yet.";
  if (coupon.expiresAt && now > coupon.expiresAt) return "This coupon has expired.";
  if (coupon.usageLimitTotal && coupon.usageCount >= coupon.usageLimitTotal) {
    return "This coupon's usage limit has been reached.";
  }
  if (userId) {
    const used = await db.couponUsage.count({ where: { couponId: coupon.id, userId } });
    if (used >= coupon.usageLimitPerUser) {
      return `You have already used this coupon the maximum allowed number of times (${coupon.usageLimitPerUser}).`;
    }
  }
  return null;
}

/** Rule 3/4: discount never exceeds subtotal; 0 when below the minimum order amount. */
export function computeDiscount(coupon: Coupon, subtotal: number): number {
  if (subtotal < coupon.minOrderAmount) return 0;
  let d =
    coupon.discountType === "PERCENTAGE"
      ? (subtotal * coupon.discountValue) / 100
      : coupon.discountValue;
  if (coupon.discountType === "PERCENTAGE" && coupon.maxDiscountAmount) d = Math.min(d, coupon.maxDiscountAmount);
  return Math.round(Math.min(subtotal, Math.max(0, d)) * 100) / 100;
}

/** Rule 5: free shipping once the post-discount subtotal reaches the configured threshold. */
export function computeShipping(subtotalAfterDiscount: number, subtotal: number, cfg: CommerceConfig): number {
  if (subtotal === 0) return 0;
  return subtotalAfterDiscount >= cfg.freeShippingThreshold ? 0 : cfg.flatFee;
}

/**
 * Rule 2: PENDING_PAYMENT orders hold a stock reservation for `stockReservationMinutes`.
 * Expired ones are cancelled lazily here (called from checkout/verify): reservation is
 * released, a ledger row is written and coupon usage is returned.
 */
export async function releaseExpiredReservations(minutes: number): Promise<number> {
  const cutoff = new Date(Date.now() - minutes * 60_000);
  const expired = await prisma.order.findMany({
    where: { status: "PENDING_PAYMENT", placedAt: { lt: cutoff } },
    include: { items: true },
    take: 50,
  });
  const released: { variantId: string; previousAvailable: number }[] = [];

  for (const order of expired) {
    try {
      await prisma.$transaction(async (tx) => {
        // guard against a concurrent verify/cancel
        const claimed = await tx.order.updateMany({
          where: { id: order.id, status: "PENDING_PAYMENT" },
          data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: "Payment window expired" },
        });
        if (claimed.count === 0) return;
        for (const item of order.items) {
          if (!item.variantId) continue;
          const v = await tx.productVariant.findUnique({ where: { id: item.variantId } });
          if (!v) continue;
          const dec = Math.min(item.quantity, v.reservedStock);
          await tx.productVariant.update({ where: { id: v.id }, data: { reservedStock: { decrement: dec } } });
          await tx.inventoryLedger.create({
            data: {
              variantId: v.id,
              changeQty: dec,
              previousStock: v.stock,
              newStock: v.stock,
              reason: "ORDER_CANCELLED",
              referenceId: order.orderNumber,
              createdBy: "SYSTEM",
            },
          });
          released.push({ variantId: v.id, previousAvailable: v.stock - v.reservedStock });
        }
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            status: "CANCELLED",
            note: `Stock reservation expired after ${minutes} minutes without payment`,
            createdBy: "SYSTEM",
          },
        });
        await tx.payment.updateMany({ where: { orderId: order.id, status: "PENDING" }, data: { status: "FAILED" } });
        const usages = await tx.couponUsage.findMany({ where: { orderId: order.id } });
        for (const u of usages) {
          await tx.coupon.update({ where: { id: u.couponId }, data: { usageCount: { decrement: 1 } } });
        }
        await tx.couponUsage.deleteMany({ where: { orderId: order.id } });
      });
    } catch (e) {
      console.error("[reservations] release failed", order.orderNumber, e);
    }
  }

  for (const r of released) {
    await handleStockChange(r.variantId, r.previousAvailable).catch(() => {});
  }
  return expired.length;
}

export type Tx = Prisma.TransactionClient;
