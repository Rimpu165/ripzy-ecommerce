import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ApiError, handler, parseJson, ok, fail } from "@/lib/api";
import {
  computeDiscount,
  computeShipping,
  couponProblem,
  getCommerceConfig,
  releaseExpiredReservations,
} from "@/lib/commerce";
import { publish } from "@/lib/events";
import { notify } from "@/lib/notify";

const addressSchema = z.object({
  fullName: z.string().trim().min(1, "Complete shipping address is required.").max(100),
  phone: z.string().trim().max(20).optional().nullable(),
  addressLine1: z.string().trim().min(1, "Complete shipping address is required.").max(200),
  addressLine2: z.string().trim().max(200).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  state: z.string().trim().max(80).optional().nullable(),
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Please enter a valid 6-digit postal PIN code."), // FR-PROF-03
});

const checkoutSchema = z.object({
  shippingAddress: addressSchema,
  billingAddress: addressSchema.optional().nullable(),
  paymentMethod: z.enum(["COD", "RAZORPAY"]).default("COD"),
  guestEmail: z.string().trim().email("Please provide a valid email address.").optional().or(z.literal("")),
  guestPhone: z.string().trim().max(20).optional().nullable(),
  guestSessionId: z.string().min(8).max(100).optional().nullable(),
  idempotencyKey: z.string().min(8).max(100).optional().nullable(),
});

const cartInclude = { items: { include: { variant: { include: { product: true } } } } } as const;

const isUniqueViolation = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

export const POST = handler({ limit: { max: 10, windowMs: 60_000, key: "checkout" } }, async ({ req }) => {
  const body = await parseJson(req, checkoutSchema);
  const { shippingAddress, billingAddress, paymentMethod, guestEmail, guestPhone, guestSessionId, idempotencyKey } = body;

  const config = await getCommerceConfig();

  // Maintenance mode: orders are paused
  if (config.maintenance) {
    return fail(503, "We're performing scheduled maintenance and orders are temporarily paused. Please try again shortly.");
  }

  if (paymentMethod === "COD" && !config.codEnabled) {
    return fail(400, "Cash on Delivery is currently unavailable. Please choose online payment.");
  }

  // Double-submission check via idempotency key (FR-CHK-08)
  if (idempotencyKey) {
    const existingOrder = await prisma.order.findUnique({ where: { idempotencyKey }, include: { items: true } });
    if (existingOrder) {
      return ok({ success: true, order: existingOrder, message: "Existing order returned (idempotent request)" });
    }
  }

  const user = await getCurrentUser();
  const customerEmail = user?.email || guestEmail || "";
  if (!user && !customerEmail) return fail(400, "Please provide an email address for order confirmation.");

  // Rule 2: free up stock held by expired unpaid orders before checking availability
  await releaseExpiredReservations(config.stockReservationMinutes);

  // Find cart
  const cart = user
    ? await prisma.cart.findFirst({ where: { userId: user.id }, include: cartInclude })
    : guestSessionId
      ? await prisma.cart.findUnique({ where: { sessionId: guestSessionId }, include: cartInclude })
      : null;

  if (!cart || cart.items.length === 0) return fail(400, "Your cart is empty.");

  // 1. Revalidate availability (Rule 1 & Rule 2)
  for (const item of cart.items) {
    const product = item.variant.product;
    if (product.deletedAt || product.status !== "ACTIVE") {
      return fail(400, `'${product.name}' is no longer available. Please remove it from your cart.`);
    }
    const availableStock = item.variant.stock - item.variant.reservedStock;
    if (availableStock < item.quantity) {
      return fail(
        400,
        `Insufficient stock for '${product.name} (${item.variant.title})'. Only ${Math.max(0, availableStock)} available.`
      );
    }
  }

  // 2. Compute server-side totals (client prices are never read)
  let subtotal = 0;
  let taxTotal = 0;
  const orderItemsData = cart.items.map((item) => {
    const unitPrice = item.variant.price;
    const lineTotal = unitPrice * item.quantity;
    const taxRate = item.variant.product.taxRate ?? 18;
    const taxAmount = (lineTotal * taxRate) / 100;
    subtotal += lineTotal;
    taxTotal += taxAmount;
    return {
      variantId: item.variantId,
      productName: item.variant.product.name,
      variantTitle: item.variant.title,
      sku: item.variant.sku,
      unitPrice,
      compareAtPrice: item.variant.compareAtPrice,
      taxRate,
      taxAmount,
      discountAmount: 0,
      quantity: item.quantity,
      totalPrice: lineTotal,
    };
  });

  // 3. Discount (Rules 3 & 4)
  let discountTotal = 0;
  let validCouponId: string | null = null;
  let validCouponCode: string | null = null;
  if (cart.couponCode) {
    const coupon = await prisma.coupon.findUnique({ where: { code: cart.couponCode } });
    const problem = await couponProblem(coupon, user?.id);
    if (problem) return fail(400, `${problem} Please remove the coupon and try again.`);
    if (coupon) {
      discountTotal = computeDiscount(coupon, subtotal);
      if (discountTotal > 0) {
        validCouponId = coupon.id;
        validCouponCode = coupon.code;
      }
    }
  }

  // Rule 5: free shipping threshold & flat fee come from settings
  const subtotalAfterDiscount = Math.max(0, subtotal - discountTotal);
  const shippingTotal = computeShipping(subtotalAfterDiscount, subtotal, config);
  const grandTotal = Math.max(0, subtotalAfterDiscount + taxTotal + shippingTotal);

  if (paymentMethod === "COD" && grandTotal > config.codMaxAmount) {
    return fail(
      400,
      `Cash on Delivery is available only for orders up to ₹${config.codMaxAmount.toLocaleString("en-IN")}. Please choose online payment.`
    );
  }

  const initialStatus = paymentMethod === "COD" ? "CONFIRMED" : "PENDING_PAYMENT";
  const actor = user?.name || "GUEST";
  const year = new Date().getFullYear();

  // 4. Atomic: reserve/deduct stock + create order + history + coupon usage + clear cart
  let order;
  for (let attempt = 0; ; attempt++) {
    try {
      order = await prisma.$transaction(async (tx) => {
        // Rule 9: sequential human-readable number
        const orderCount = await tx.order.count();
        const orderNumber = `ORD-${year}-${String(orderCount + 101 + attempt).padStart(6, "0")}`;

        // Re-validate coupon limits inside the transaction (race safety)
        if (validCouponId) {
          const fresh = await tx.coupon.findUnique({ where: { id: validCouponId } });
          const problem = await couponProblem(fresh, user?.id, tx);
          if (problem) throw new ApiError(400, `${problem} Please remove the coupon and try again.`);
        }

        for (const item of cart.items) {
          if (paymentMethod === "COD") {
            // COD: deduct real stock immediately
            const v = await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: { decrement: item.quantity } },
            });
            if (v.stock < 0 || v.stock - v.reservedStock < 0) {
              throw new ApiError(409, `Insufficient stock for '${item.variant.product.name} (${item.variant.title})'.`);
            }
            await tx.inventoryLedger.create({
              data: {
                variantId: item.variantId,
                changeQty: -item.quantity,
                previousStock: v.stock + item.quantity,
                newStock: v.stock,
                reason: "ORDER_CONFIRMED",
                referenceId: orderNumber,
                createdBy: actor,
              },
            });
          } else {
            // Online payment: reserve (held for stockReservationMinutes, Rule 2)
            const v = await tx.productVariant.update({
              where: { id: item.variantId },
              data: { reservedStock: { increment: item.quantity } },
            });
            if (v.stock - v.reservedStock < 0) {
              throw new ApiError(409, `Insufficient stock for '${item.variant.product.name} (${item.variant.title})'.`);
            }
            await tx.inventoryLedger.create({
              data: {
                variantId: item.variantId,
                changeQty: -item.quantity,
                previousStock: v.stock,
                newStock: v.stock, // physical deduction happens on payment confirmation
                reason: "ORDER_RESERVED",
                referenceId: orderNumber,
                createdBy: actor,
              },
            });
          }
        }

        const newOrder = await tx.order.create({
          data: {
            orderNumber,
            userId: user?.id || null,
            guestEmail: !user ? customerEmail : null,
            guestPhone: !user ? guestPhone || null : null,
            status: initialStatus,
            subtotal,
            discountTotal,
            taxTotal,
            shippingTotal,
            grandTotal,
            couponCode: validCouponCode,
            shippingAddressJson: JSON.stringify(shippingAddress),
            billingAddressJson: JSON.stringify(billingAddress || shippingAddress),
            idempotencyKey: idempotencyKey || null,
            items: { create: orderItemsData },
            statusHistory: {
              create: {
                status: initialStatus,
                note: `Order initiated with payment method: ${paymentMethod}`,
                createdBy: user?.name || "Customer",
              },
            },
            payments: {
              create: { paymentMethod, status: "PENDING", amount: grandTotal, currency: "INR" },
            },
          },
          include: { items: true, payments: true },
        });

        if (validCouponId) {
          await tx.couponUsage.create({
            data: { couponId: validCouponId, orderId: newOrder.id, userId: user?.id || null, discountAmount: discountTotal },
          });
          await tx.coupon.update({ where: { id: validCouponId }, data: { usageCount: { increment: 1 } } });
        }

        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
        await tx.cart.update({ where: { id: cart.id }, data: { couponCode: null } });

        return newOrder;
      });
      break;
    } catch (e) {
      if (isUniqueViolation(e)) {
        // Concurrent double-submit with the same key -> return the winner's order
        if (idempotencyKey) {
          const existing = await prisma.order.findUnique({ where: { idempotencyKey }, include: { items: true } });
          if (existing) return ok({ success: true, order: existing, message: "Existing order returned (idempotent request)" });
        }
        if (attempt < 4) continue; // order-number collision: retry with next number
      }
      throw e;
    }
  }

  // Side effects (never break the order)
  publish({
    type: "order.created",
    title: `New order ${order.orderNumber}`,
    message: `₹${Math.round(grandTotal).toLocaleString("en-IN")}`,
    href: "/admin/orders",
  });
  if (paymentMethod === "COD") {
    await notify({
      userId: user?.id ?? null,
      to: customerEmail,
      type: "ORDER_CONFIRMED",
      subject: `Your Ripzy Order ${order.orderNumber} is Confirmed!`,
      content: `Thank you for your order! Total amount: ₹${Math.round(grandTotal).toLocaleString("en-IN")} (Cash on Delivery). Order status: ${initialStatus}.`,
    });
  }

  return ok({
    success: true,
    order,
    reservationMinutes: paymentMethod === "COD" ? null : config.stockReservationMinutes,
    message:
      paymentMethod === "COD"
        ? "Order placed successfully with Cash on Delivery!"
        : "Order initiated. Please proceed to payment.",
  });
});
