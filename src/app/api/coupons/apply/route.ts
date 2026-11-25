import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { handler, parseJson, ok, fail } from "@/lib/api";
import { couponProblem } from "@/lib/commerce";

const applySchema = z.object({
  code: z.string().trim().min(1, "Coupon code is required").max(40),
  guestSessionId: z.string().min(8).max(100).optional(),
});

export const POST = handler({ limit: { max: 20, windowMs: 60_000, key: "coupon:apply" } }, async ({ req }) => {
  const { code, guestSessionId } = await parseJson(req, applySchema);
  const normalizedCode = code.toUpperCase();

  const coupon = await prisma.coupon.findUnique({ where: { code: normalizedCode } });
  const user = await getCurrentUser();

  const problem = await couponProblem(coupon, user?.id);
  if (problem || !coupon) {
    return fail(!coupon || !coupon.isActive ? 404 : 400, problem || "Invalid or inactive coupon code.");
  }

  const cartWhere = user ? { userId: user.id } : guestSessionId ? { sessionId: guestSessionId } : null;
  if (!cartWhere) return fail(400, "No cart found for this session.");

  const cart = await prisma.cart.findFirst({
    where: cartWhere,
    include: { items: { include: { variant: true } } },
  });
  if (!cart || cart.items.length === 0) return fail(400, "Your cart is empty.");

  const subtotal = cart.items.reduce((s, i) => s + i.variant.price * i.quantity, 0);
  if (subtotal < coupon.minOrderAmount) {
    return fail(
      400,
      `Add items worth ₹${Math.ceil(coupon.minOrderAmount - subtotal).toLocaleString("en-IN")} more to use this coupon (minimum order ₹${coupon.minOrderAmount.toLocaleString("en-IN")}).`
    );
  }

  await prisma.cart.update({ where: { id: cart.id }, data: { couponCode: coupon.code } });

  return ok({
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
});

const removeSchema = z.object({ guestSessionId: z.string().min(8).max(100).optional() });

export const DELETE = handler({ limit: { max: 30, windowMs: 60_000, key: "coupon:remove" } }, async ({ req }) => {
  const { guestSessionId } = await parseJson(req, removeSchema);
  const user = await getCurrentUser();

  if (user) {
    await prisma.cart.updateMany({ where: { userId: user.id }, data: { couponCode: null } });
  } else if (guestSessionId) {
    await prisma.cart.updateMany({ where: { sessionId: guestSessionId }, data: { couponCode: null } });
  }
  return ok({ success: true, message: "Coupon removed" });
});
