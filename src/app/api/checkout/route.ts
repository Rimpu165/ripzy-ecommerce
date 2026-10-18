import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const {
      shippingAddress,
      billingAddress,
      paymentMethod = "COD", // "RAZORPAY" | "COD"
      guestEmail,
      guestPhone,
      guestSessionId,
      idempotencyKey,
    } = await req.json();

    if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.addressLine1 || !shippingAddress.postalCode) {
      return NextResponse.json({ error: "Complete shipping address is required." }, { status: 400 });
    }

    // 6-digit PIN code validation (FR-PROF-03)
    if (!/^\d{6}$/.test(shippingAddress.postalCode.trim())) {
      return NextResponse.json({ error: "Please enter a valid 6-digit postal PIN code." }, { status: 400 });
    }

    // Double-submission check via idempotency key (FR-CHK-08)
    if (idempotencyKey) {
      const existingOrder = await prisma.order.findUnique({
        where: { idempotencyKey },
        include: { items: true },
      });
      if (existingOrder) {
        return NextResponse.json({
          order: existingOrder,
          message: "Existing order returned (idempotent request)",
        });
      }
    }

    const user = await getCurrentUser();

    // Find cart
    let cart = null;
    if (user) {
      cart = await prisma.cart.findFirst({
        where: { userId: user.id },
        include: { items: { include: { variant: { include: { product: true } } } } },
      });
    } else if (guestSessionId) {
      cart = await prisma.cart.findUnique({
        where: { sessionId: guestSessionId },
        include: { items: { include: { variant: { include: { product: true } } } } },
      });
    }

    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });
    }

    // 1. Revalidate stock & reserve stock (Rule 1 & Rule 2)
    for (const item of cart.items) {
      const availableStock = item.variant.stock - item.variant.reservedStock;
      if (availableStock < item.quantity) {
        return NextResponse.json(
          {
            error: `Insufficient stock for '${item.variant.product.name} (${item.variant.title})'. Only ${Math.max(
              0,
              availableStock
            )} available.`,
          },
          { status: 400 }
        );
      }
    }

    // 2. Compute server-side totals
    let subtotal = 0;
    let taxTotal = 0;
    const orderItemsData = cart.items.map((item) => {
      const unitPrice = item.variant.price;
      const lineTotal = unitPrice * item.quantity;
      const taxRate = item.variant.product.taxRate || 18.0;
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

    // 3. Discount calculation
    let discountTotal = 0;
    let validCoupon = null;
    if (cart.couponCode) {
      validCoupon = await prisma.coupon.findUnique({
        where: { code: cart.couponCode },
      });
      if (validCoupon && validCoupon.isActive && (!validCoupon.expiresAt || new Date() < validCoupon.expiresAt)) {
        if (subtotal >= validCoupon.minOrderAmount) {
          if (validCoupon.discountType === "PERCENTAGE") {
            const rawDiscount = (subtotal * validCoupon.discountValue) / 100;
            discountTotal = validCoupon.maxDiscountAmount
              ? Math.min(rawDiscount, validCoupon.maxDiscountAmount)
              : rawDiscount;
          } else {
            discountTotal = Math.min(subtotal, validCoupon.discountValue);
          }
        }
      }
    }

    // Rule 5: Free shipping when subtotal after discount >= 999
    const subtotalAfterDiscount = Math.max(0, subtotal - discountTotal);
    const shippingTotal = subtotalAfterDiscount >= 999 ? 0 : 99;
    const grandTotal = Math.max(0, subtotalAfterDiscount + taxTotal + shippingTotal);

    // Rule 9: Human-readable unique order number (e.g. ORD-2026-000101)
    const orderCount = await prisma.order.count();
    const orderNumber = `ORD-2026-${String(orderCount + 101).padStart(6, "0")}`;

    // DB Transaction: Reserve stock + create Order + record history
    const order = await prisma.$transaction(async (tx) => {
      // 1. Reserve stock
      for (const item of cart.items) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: {
            reservedStock: { increment: item.quantity },
          },
        });

        // Add inventory ledger entry (Rule 2)
        await tx.inventoryLedger.create({
          data: {
            variantId: item.variantId,
            changeQty: -item.quantity,
            previousStock: item.variant.stock,
            newStock: item.variant.stock, // actual deduction happens on payment confirm or COD confirm
            reason: "ORDER_RESERVED",
            referenceId: orderNumber,
            createdBy: user?.name || "GUEST",
          },
        });
      }

      // Initial status: If COD, CONFIRMED immediately; If Razorpay, PENDING_PAYMENT
      const initialStatus = paymentMethod === "COD" ? "CONFIRMED" : "PENDING_PAYMENT";

      // 2. Create order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: user?.id || null,
          guestEmail: !user ? guestEmail : null,
          guestPhone: !user ? guestPhone : null,
          status: initialStatus,
          subtotal,
          discountTotal,
          taxTotal,
          shippingTotal,
          grandTotal,
          couponCode: validCoupon?.code || null,
          shippingAddressJson: JSON.stringify(shippingAddress),
          billingAddressJson: JSON.stringify(billingAddress || shippingAddress),
          idempotencyKey: idempotencyKey || null,
          paidAt: paymentMethod === "COD" ? null : null,
          items: {
            create: orderItemsData,
          },
          statusHistory: {
            create: {
              status: initialStatus,
              note: `Order initiated with payment method: ${paymentMethod}`,
              createdBy: user?.name || "Customer",
            },
          },
          payments: {
            create: {
              paymentMethod,
              status: paymentMethod === "COD" ? "PENDING" : "PENDING",
              amount: grandTotal,
              currency: "INR",
            },
          },
        },
        include: {
          items: true,
          payments: true,
        },
      });

      // If COD, deduct real stock right away
      if (paymentMethod === "COD") {
        for (const item of cart.items) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: {
              stock: { decrement: item.quantity },
              reservedStock: { decrement: item.quantity },
            },
          });
        }
      }

      // Record coupon usage
      if (validCoupon && discountTotal > 0) {
        await tx.couponUsage.create({
          data: {
            couponId: validCoupon.id,
            orderId: newOrder.id,
            userId: user?.id || null,
            discountAmount: discountTotal,
          },
        });
        await tx.coupon.update({
          where: { id: validCoupon.id },
          data: { usageCount: { increment: 1 } },
        });
      }

      // Clear cart items
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });
      await tx.cart.update({
        where: { id: cart.id },
        data: { couponCode: null },
      });

      // Log notification
      await tx.notification.create({
        data: {
          userId: user?.id || null,
          recipientEmail: user?.email || guestEmail || "customer@ripzy.com",
          subject: `Your Ripzy Order ${orderNumber} is Confirmed!`,
          type: "ORDER_CONFIRMED",
          content: `Thank you for your order! Total amount: ₹${grandTotal}. Order status: ${initialStatus}.`,
          status: "SENT",
        },
      });

      return newOrder;
    });

    return NextResponse.json({
      success: true,
      order,
      message:
        paymentMethod === "COD"
          ? "Order placed successfully with Cash on Delivery!"
          : "Order initiated. Please proceed to payment.",
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Failed to place order." }, { status: 500 });
  }
}
