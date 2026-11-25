import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { handler, parseJson, ok, fail } from "@/lib/api";
import { computeDiscount, computeShipping, couponProblem, getCommerceConfig } from "@/lib/commerce";

const MAX_QTY_PER_ITEM = 10; // FR-CART-03

const cartInclude = {
  items: {
    include: {
      variant: { include: { product: { include: { images: true } } } },
    },
  },
} as const;

async function getOrCreateCart(userId?: string, sessionId?: string) {
  if (userId) {
    const existing = await prisma.cart.findFirst({ where: { userId }, include: cartInclude });
    return existing ?? prisma.cart.create({ data: { userId }, include: cartInclude });
  }
  if (sessionId) {
    const existing = await prisma.cart.findUnique({ where: { sessionId }, include: cartInclude });
    return existing ?? prisma.cart.create({ data: { sessionId }, include: cartInclude });
  }
  return null;
}

const sessionSchema = z.string().min(8).max(100).optional();

export const GET = handler({}, async ({ req }) => {
  const { searchParams } = new URL(req.url);
  const guestSessionId = searchParams.get("guestSessionId") || undefined;
  const user = await getCurrentUser();
  const config = await getCommerceConfig();

  const cart = await getOrCreateCart(user?.id, guestSessionId);

  if (!cart) {
    return ok({
      items: [],
      subtotal: 0,
      discountTotal: 0,
      taxTotal: 0,
      shippingTotal: 0,
      grandTotal: 0,
      itemCount: 0,
      config,
    });
  }

  // Server-side revalidation of prices and stock (FR-CART-05 & Rule 1)
  let subtotal = 0;
  let taxTotal = 0;
  const items = cart.items
    .filter((item) => item.variant.product.status === "ACTIVE" && !item.variant.product.deletedAt)
    .map((item) => {
      const available = Math.max(0, item.variant.stock - item.variant.reservedStock);
      const currentPrice = item.variant.price;
      const effectiveQty = Math.min(item.quantity, Math.max(1, available));
      const lineTotal = currentPrice * effectiveQty;
      const lineTax = (lineTotal * (item.variant.product.taxRate ?? 18)) / 100;

      subtotal += lineTotal;
      taxTotal += lineTax;

      const primaryImg =
        item.variant.product.images.find((img) => img.isPrimary)?.url || item.variant.product.images[0]?.url || "";

      return {
        id: item.id,
        variantId: item.variantId,
        productId: item.variant.productId,
        productName: item.variant.product.name,
        variantTitle: item.variant.title,
        sku: item.variant.sku,
        price: currentPrice,
        compareAtPrice: item.variant.compareAtPrice,
        quantity: effectiveQty,
        stockAvailable: available,
        image: primaryImg,
        lineTotal,
      };
    });

  // Discount (Rule 3 & 4) - only reported when the coupon is currently valid and applicable
  let discountTotal = 0;
  let appliedCode: string | null = null;
  if (cart.couponCode) {
    const coupon = await prisma.coupon.findUnique({ where: { code: cart.couponCode } });
    if (coupon && !(await couponProblem(coupon, user?.id))) {
      discountTotal = computeDiscount(coupon, subtotal);
      if (discountTotal > 0) appliedCode = coupon.code;
    }
  }

  // Shipping (Rule 5) - threshold & fee from settings
  const subtotalAfterDiscount = Math.max(0, subtotal - discountTotal);
  const shippingTotal = computeShipping(subtotalAfterDiscount, subtotal, config);
  const grandTotal = Math.max(0, subtotalAfterDiscount + taxTotal + shippingTotal);

  return ok({
    cartId: cart.id,
    items,
    couponCode: appliedCode,
    subtotal,
    discountTotal,
    taxTotal,
    shippingTotal,
    grandTotal,
    itemCount: items.reduce((acc, it) => acc + it.quantity, 0),
    config,
  });
});

const addSchema = z.object({
  variantId: z.string().min(1, "variantId is required"),
  quantity: z.coerce.number().int().min(1).max(MAX_QTY_PER_ITEM).default(1),
  guestSessionId: sessionSchema,
});

export const POST = handler({ limit: { max: 60, windowMs: 60_000, key: "cart:add" } }, async ({ req }) => {
  const { variantId, quantity, guestSessionId } = await parseJson(req, addSchema);

  const user = await getCurrentUser();
  const cart = await getOrCreateCart(user?.id, guestSessionId);
  if (!cart) return fail(400, "Unable to find or create cart");

  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { product: { select: { status: true, deletedAt: true } } },
  });
  if (!variant || variant.product.deletedAt || variant.product.status !== "ACTIVE") {
    return fail(404, "Product variant not found");
  }

  const available = variant.stock - variant.reservedStock;
  if (available <= 0) return fail(400, "This item is currently out of stock.");

  const existingItem = await prisma.cartItem.findUnique({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
  });

  const requestedQty = (existingItem?.quantity ?? 0) + quantity;
  const finalQty = Math.min(MAX_QTY_PER_ITEM, available, requestedQty);

  if (existingItem) {
    await prisma.cartItem.update({ where: { id: existingItem.id }, data: { quantity: finalQty } });
  } else {
    await prisma.cartItem.create({ data: { cartId: cart.id, variantId, quantity: finalQty } });
  }

  return ok({ success: true, message: "Added to cart" });
});

const patchSchema = z.object({
  cartItemId: z.string().min(1, "cartItemId and quantity are required"),
  quantity: z.coerce.number().int().min(0).max(1000),
  guestSessionId: sessionSchema,
});

export const PATCH = handler({ limit: { max: 120, windowMs: 60_000, key: "cart:update" } }, async ({ req }) => {
  const { cartItemId, quantity, guestSessionId } = await parseJson(req, patchSchema);
  const user = await getCurrentUser();

  // Ownership check: the item must belong to the caller's cart
  const cart = user
    ? await prisma.cart.findFirst({ where: { userId: user.id } })
    : guestSessionId
      ? await prisma.cart.findUnique({ where: { sessionId: guestSessionId } })
      : null;
  if (!cart) return fail(404, "Cart item not found");

  const item = await prisma.cartItem.findFirst({
    where: { id: cartItemId, cartId: cart.id },
    include: { variant: true },
  });
  if (!item) return fail(404, "Cart item not found");

  if (quantity <= 0) {
    await prisma.cartItem.delete({ where: { id: item.id } });
    return ok({ success: true, message: "Item removed" });
  }

  const available = Math.max(0, item.variant.stock - item.variant.reservedStock);
  const finalQty = Math.min(MAX_QTY_PER_ITEM, Math.max(1, available), quantity);
  await prisma.cartItem.update({ where: { id: item.id }, data: { quantity: finalQty } });

  return ok({ success: true, message: "Cart updated" });
});
