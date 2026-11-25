import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handler, parseJson, ok, fail } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

const schema = z.object({
  variantId: z.string().min(1).max(60),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
});

export const POST = handler({ limit: { max: 20, windowMs: 60 * 60 * 1000, key: "stock-alerts" } }, async ({ req }) => {
  const { variantId, email } = await parseJson(req, schema);
  const user = await getCurrentUser();

  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { product: { select: { status: true, deletedAt: true } } },
  });
  if (!variant || variant.product.deletedAt || variant.product.status !== "ACTIVE") {
    return fail(404, "Product not found.");
  }
  if (variant.stock - variant.reservedStock > 0) {
    return fail(400, "This item is currently in stock - no alert needed.");
  }

  const existing = await prisma.stockAlert.findUnique({ where: { variantId_email: { variantId, email } } });
  if (existing) {
    // Re-arm if previously notified; otherwise idempotent.
    if (existing.notifiedAt) await prisma.stockAlert.update({ where: { id: existing.id }, data: { notifiedAt: null } });
  } else {
    await prisma.stockAlert.create({ data: { variantId, email, userId: user?.id ?? null } });
  }
  return ok({ success: true, message: "Done! We will email you as soon as it is back in stock." });
});
