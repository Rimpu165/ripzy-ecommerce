import crypto from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { handler, parseJson, ok, fail } from "@/lib/api";
import { getCommerceConfig, releaseExpiredReservations } from "@/lib/commerce";
import { notify } from "@/lib/notify";
import { handleStockChange } from "@/lib/stock-alerts";

const verifySchema = z.object({
  orderId: z.string().min(1, "orderId is required"),
  pgOrderId: z.string().max(200).optional(),
  pgPaymentId: z.string().max(200).optional(),
  pgSignature: z.string().max(500).optional(),
});

export const POST = handler({ limit: { max: 20, windowMs: 60_000, key: "checkout:verify" } }, async ({ req }) => {
  const { orderId, pgOrderId, pgPaymentId, pgSignature } = await parseJson(req, verifySchema);

  const config = await getCommerceConfig();
  // Rule 2: expire stale reservations first (may cancel this very order)
  await releaseExpiredReservations(config.stockReservationMinutes);

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, user: { select: { email: true } } },
  });
  if (!order) return fail(404, "Order not found");

  // Orders owned by an account can only be verified by that account
  if (order.userId) {
    const user = await getCurrentUser();
    if (!user || user.id !== order.userId) return fail(403, "Forbidden");
  }

  // Idempotent: already paid
  if (order.status !== "PENDING_PAYMENT") {
    if (order.paidAt) {
      return ok({ success: true, message: "Payment already verified.", orderNumber: order.orderNumber });
    }
    return fail(409, "This order can no longer be paid (the stock reservation expired). Please place a new order.");
  }

  // Verify HMAC SHA256 signature when the gateway secret is configured (FR-PAY-02)
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (keySecret) {
    if (!pgOrderId || !pgPaymentId || !pgSignature) {
      return fail(400, "Payment details are required.");
    }
    const expected = crypto.createHmac("sha256", keySecret).update(`${pgOrderId}|${pgPaymentId}`).digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(pgSignature);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return fail(400, "Invalid payment signature verification failed.");
    }
  }

  const changed: { variantId: string; previousAvailable: number }[] = [];

  const confirmed = await prisma.$transaction(async (tx) => {
    // Claim the transition atomically so concurrent verifies cannot double-deduct
    const claim = await tx.order.updateMany({
      where: { id: order.id, status: "PENDING_PAYMENT" },
      data: { status: "CONFIRMED", paidAt: new Date() },
    });
    if (claim.count === 0) return false;

    await tx.payment.updateMany({
      where: { orderId: order.id },
      data: {
        status: "SUCCESS",
        pgOrderId: pgOrderId || "mock_order_id",
        pgPaymentId: pgPaymentId || "mock_payment_id",
        pgSignature: pgSignature || "mock_sig",
      },
    });

    // Deduct actual stock & release the reservation
    for (const item of order.items) {
      if (!item.variantId) continue;
      const v = await tx.productVariant.findUnique({ where: { id: item.variantId } });
      if (!v) continue;
      const releaseQty = Math.min(item.quantity, v.reservedStock);
      await tx.productVariant.update({
        where: { id: item.variantId },
        data: { stock: { decrement: item.quantity }, reservedStock: { decrement: releaseQty } },
      });
      await tx.inventoryLedger.create({
        data: {
          variantId: item.variantId,
          changeQty: -item.quantity,
          previousStock: v.stock,
          newStock: v.stock - item.quantity,
          reason: "ORDER_CONFIRMED",
          referenceId: order.orderNumber,
          createdBy: "PAYMENT_GATEWAY",
        },
      });
      changed.push({ variantId: item.variantId, previousAvailable: v.stock - v.reservedStock });
    }

    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: "CONFIRMED",
        note: `Payment verified successfully via Razorpay (Payment ID: ${pgPaymentId || "PG-DIRECT"})`,
        createdBy: "Payment Gateway",
      },
    });
    return true;
  });

  if (confirmed) {
    const to = order.user?.email || order.guestEmail;
    if (to) {
      await notify({
        userId: order.userId,
        to,
        type: "ORDER_CONFIRMED",
        subject: `Your Ripzy Order ${order.orderNumber} is Confirmed!`,
        content: `Payment received. Thank you for your order! Total amount: ₹${Math.round(order.grandTotal).toLocaleString("en-IN")}.`,
      });
    }
    for (const c of changed) await handleStockChange(c.variantId, c.previousAvailable).catch(() => {});
  }

  return ok({
    success: true,
    message: "Payment successfully verified and order confirmed!",
    orderNumber: order.orderNumber,
  });
});
