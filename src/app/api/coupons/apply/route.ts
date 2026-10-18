import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { code, guestSessionId } = await req.json();

    if (!code) {
      return NextResponse.json({ error: "Coupon code is required" }, { status: 400 });
    }

    const normalizedCode = code.toUpperCase().trim();
    const coupon = await prisma.coupon.findUnique({
      where: { code: normalizedCode },
    });

    if (!coupon || !coupon.isActive) {
      return NextResponse.json({ error: "Invalid or inactive coupon code." }, { status: 404 });
    }

    if (coupon.expiresAt && new Date() > coupon.expiresAt) {
      return NextResponse.json({ error: "This coupon has expired." }, { status: 400 });
    }

    if (coupon.usageLimitTotal && coupon.usageCount >= coupon.usageLimitTotal) {
      return NextResponse.json({ error: "This coupon's usage limit has been reached." }, { status: 400 });
    }

    const user = await getCurrentUser();

    // Check per-user limit
    if (user) {
      const userUsage = await prisma.couponUsage.count({
        where: { couponId: coupon.id, userId: user.id },
      });
      if (userUsage >= coupon.usageLimitPerUser) {
        return NextResponse.json(
          { error: `You have already used this coupon the maximum allowed number of times (${coupon.usageLimitPerUser}).` },
          { status: 400 }
        );
      }
    }

    // Attach to cart
    if (user) {
      await prisma.cart.updateMany({
        where: { userId: user.id },
        data: { couponCode: coupon.code },
      });
    } else if (guestSessionId) {
      await prisma.cart.updateMany({
        where: { sessionId: guestSessionId },
        data: { couponCode: coupon.code },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Coupon '${coupon.code}' applied successfully!`,
      coupon: {
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minOrderAmount: coupon.minOrderAmount,
      },
    });
  } catch (error) {
    console.error("Coupon apply error:", error);
    return NextResponse.json({ error: "Failed to apply coupon." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { guestSessionId } = await req.json();
    const user = await getCurrentUser();

    if (user) {
      await prisma.cart.updateMany({
        where: { userId: user.id },
        data: { couponCode: null },
      });
    } else if (guestSessionId) {
      await prisma.cart.updateMany({
        where: { sessionId: guestSessionId },
        data: { couponCode: null },
      });
    }

    return NextResponse.json({ success: true, message: "Coupon removed" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to remove coupon" }, { status: 500 });
  }
}
