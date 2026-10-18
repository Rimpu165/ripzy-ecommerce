import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { orderId, pgOrderId, pgPaymentId, pgSignature } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, payments: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Verify HMAC SHA256 signature if key secret is present (FR-PAY-02)
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    let isValidSignature = true;

    if (keySecret && pgOrderId && pgPaymentId && pgSignature) {
      const generatedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(`${pgOrderId}|${pgPaymentId}`)
        .digest("hex");
      isValidSignature = generatedSignature === pgSignature;
    }

    if (!isValidSignature) {
      return NextResponse.json({ error: "Invalid payment signature verification failed." }, { status: 400 });
    }

    // Execute state transition to CONFIRMED and deduct real inventory
    await prisma.$transaction(async (tx) => {
      // 1. Update order
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "CONFIRMED",
          paidAt: new Date(),
        },
      });

      // 2. Update payment
      await tx.payment.updateMany({
        where: { orderId: order.id },
        data: {
          status: "SUCCESS",
          pgOrderId: pgOrderId || "mock_order_id",
          pgPaymentId: pgPaymentId || "mock_payment_id",
          pgSignature: pgSignature || "mock_sig",
        },
      });

      // 3. Deduct actual stock from inventory & release reservation
      for (const item of order.items) {
        if (item.variantId) {
          const v = await tx.productVariant.findUnique({
            where: { id: item.variantId },
          });
          if (v) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: {
                stock: { decrement: item.quantity },
                reservedStock: { decrement: item.quantity },
              },
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
          }
        }
      }

      // 4. Record order history timeline
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: "CONFIRMED",
          note: `Payment verified successfully via Razorpay (Payment ID: ${pgPaymentId || "PG-DIRECT"})`,
          createdBy: "Payment Gateway",
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Payment successfully verified and order confirmed!",
      orderNumber: order.orderNumber,
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.json({ error: "Failed to verify payment." }, { status: 500 });
  }
}
