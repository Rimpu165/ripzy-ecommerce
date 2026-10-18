import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

async function getOrCreateCart(userId?: string, sessionId?: string) {
  if (userId) {
    let cart = await prisma.cart.findFirst({
      where: { userId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  include: {
                    images: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: {
                    include: {
                      images: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    }
    return cart;
  }

  if (sessionId) {
    let cart = await prisma.cart.findUnique({
      where: { sessionId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  include: {
                    images: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { sessionId },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: {
                    include: {
                      images: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    }
    return cart;
  }

  return null;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const guestSessionId = searchParams.get("guestSessionId") || undefined;
    const user = await getCurrentUser();

    const cart = await getOrCreateCart(user?.id, guestSessionId);

    if (!cart) {
      return NextResponse.json({
        items: [],
        subtotal: 0,
        discountTotal: 0,
        taxTotal: 0,
        shippingTotal: 0,
        grandTotal: 0,
      });
    }

    // Server-side revalidation of prices and stock (FR-CART-05 & Rule 1)
    let subtotal = 0;
    let taxTotal = 0;
    const items = cart.items.map((item) => {
      const currentPrice = item.variant.price;
      const effectiveQty = Math.min(item.quantity, Math.max(1, item.variant.stock));
      const lineTotal = currentPrice * effectiveQty;
      const lineTax = (lineTotal * (item.variant.product.taxRate || 18.0)) / 100;

      subtotal += lineTotal;
      taxTotal += lineTax;

      const primaryImg =
        item.variant.product.images.find((img) => img.isPrimary)?.url ||
        item.variant.product.images[0]?.url ||
        "";

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
        stockAvailable: item.variant.stock,
        image: primaryImg,
        lineTotal,
      };
    });

    // Check discount if coupon applied
    let discountTotal = 0;
    if (cart.couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: cart.couponCode },
      });
      if (coupon && coupon.isActive && (!coupon.expiresAt || new Date() < coupon.expiresAt)) {
        if (subtotal >= coupon.minOrderAmount) {
          if (coupon.discountType === "PERCENTAGE") {
            const rawDiscount = (subtotal * coupon.discountValue) / 100;
            discountTotal = coupon.maxDiscountAmount
              ? Math.min(rawDiscount, coupon.maxDiscountAmount)
              : rawDiscount;
          } else {
            discountTotal = Math.min(subtotal, coupon.discountValue);
          }
        }
      }
    }

    // Shipping calculation (Rule 5: Free above threshold)
    const subtotalAfterDiscount = Math.max(0, subtotal - discountTotal);
    const shippingTotal = subtotalAfterDiscount >= 999 || subtotal === 0 ? 0 : 99;
    const grandTotal = Math.max(0, subtotalAfterDiscount + taxTotal + shippingTotal);

    return NextResponse.json({
      cartId: cart.id,
      items,
      couponCode: cart.couponCode,
      subtotal,
      discountTotal,
      taxTotal,
      shippingTotal,
      grandTotal,
      itemCount: items.reduce((acc, it) => acc + it.quantity, 0),
    });
  } catch (error) {
    console.error("Cart GET error:", error);
    return NextResponse.json({ error: "Failed to load cart." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { variantId, quantity = 1, guestSessionId } = await req.json();

    if (!variantId) {
      return NextResponse.json({ error: "variantId is required" }, { status: 400 });
    }

    const user = await getCurrentUser();
    const cart = await getOrCreateCart(user?.id, guestSessionId);

    if (!cart) {
      return NextResponse.json({ error: "Unable to find or create cart" }, { status: 400 });
    }

    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
    });

    if (!variant) {
      return NextResponse.json({ error: "Product variant not found" }, { status: 404 });
    }

    if (variant.stock <= 0) {
      return NextResponse.json({ error: "This item is currently out of stock." }, { status: 400 });
    }

    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_variantId: {
          cartId: cart.id,
          variantId,
        },
      },
    });

    // Per-order limit: default 10 (FR-CART-03)
    const currentQty = existingItem ? existingItem.quantity : 0;
    const requestedQty = currentQty + quantity;
    const finalQty = Math.min(10, Math.min(variant.stock, requestedQty));

    if (existingItem) {
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: finalQty },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          variantId,
          quantity: finalQty,
        },
      });
    }

    return NextResponse.json({ success: true, message: "Added to cart" });
  } catch (error) {
    console.error("Cart POST error:", error);
    return NextResponse.json({ error: "Failed to add item to cart" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { cartItemId, quantity, guestSessionId } = await req.json();

    if (!cartItemId || quantity === undefined) {
      return NextResponse.json({ error: "cartItemId and quantity are required" }, { status: 400 });
    }

    if (quantity <= 0) {
      await prisma.cartItem.delete({
        where: { id: cartItemId },
      });
      return NextResponse.json({ success: true, message: "Item removed" });
    }

    const item = await prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: { variant: true },
    });

    if (!item) {
      return NextResponse.json({ error: "Cart item not found" }, { status: 404 });
    }

    const finalQty = Math.min(10, Math.min(item.variant.stock, quantity));

    await prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity: finalQty },
    });

    return NextResponse.json({ success: true, message: "Cart updated" });
  } catch (error) {
    console.error("Cart PATCH error:", error);
    return NextResponse.json({ error: "Failed to update cart" }, { status: 500 });
  }
}
