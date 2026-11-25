import { z } from "zod";
import { handler, parseJson, ok, fail } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { publish } from "@/lib/events";

const schema = z.object({
  productId: z.string().min(1).max(64),
  rating: z.coerce.number().min(1, "Rating must be between 1 and 5 stars.").max(5, "Rating must be between 1 and 5 stars."),
  title: z.string().trim().max(120).optional().nullable(),
  comment: z.string().trim().min(1, "Product, rating (1-5) and comment are required.").max(2000),
});

export const POST = handler({ auth: true, limit: { max: 10, windowMs: 10 * 60_000 } }, async ({ user, req }) => {
  const { productId, rating, title, comment } = await parseJson(req, schema);

  const product = await prisma.product.findFirst({ where: { id: productId, deletedAt: null }, select: { id: true, name: true } });
  if (!product) return fail(404, "Product not found.");

  // Rule 10 & FR-REV-03: One review per product per customer
  const existing = await prisma.review.findUnique({ where: { productId_userId: { productId, userId: user!.id } } });
  if (existing) return fail(400, "You have already reviewed this product. Only one review per product is allowed.");

  // FR-REV-01: verified purchaser check
  const verifiedOrder = await prisma.order.findFirst({
    where: {
      userId: user!.id,
      status: { in: ["DELIVERED", "CONFIRMED", "PROCESSING", "SHIPPED"] },
      items: { some: { variant: { productId } } },
    },
  });

  const review = await prisma.review.create({
    data: {
      productId,
      userId: user!.id,
      orderId: verifiedOrder?.id || null,
      rating: Math.round(rating),
      title: title || null,
      comment,
      isVerifiedBuyer: Boolean(verifiedOrder),
      status: "APPROVED", // Auto-approved; moderators can reject afterwards
    },
  });

  publish({
    type: "review.created",
    title: "New review",
    message: `${user!.name} rated ${product.name} ${review.rating}/5`,
    href: "/admin/reviews",
  });

  return ok({ success: true, message: "Thank you! Your review has been submitted successfully.", review });
});
