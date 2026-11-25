import { z } from "zod";
import { handler, parseJson, ok, fail } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export const GET = handler({ permission: "reviews.moderate" }, async ({ req }) => {
  const sp = new URL(req.url).searchParams;
  const status = z.enum(["PENDING", "APPROVED", "REJECTED"]).safeParse(sp.get("status"));
  const reviews = await prisma.review.findMany({
    where: status.success ? { status: status.data } : {},
    include: {
      product: { select: { name: true, slug: true } },
      user: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return ok({ reviews });
});

const patchSchema = z.object({
  reviewId: z.string().min(1).max(64),
  status: z.enum(["APPROVED", "REJECTED", "PENDING"]),
});

export const PATCH = handler({ permission: "reviews.moderate", limit: { max: 120, windowMs: 60_000 } }, async ({ user, req }) => {
  const { reviewId, status } = await parseJson(req, patchSchema);
  const existing = await prisma.review.findUnique({ where: { id: reviewId }, select: { status: true } });
  if (!existing) return fail(404, "Review not found.");
  const updated = await prisma.review.update({ where: { id: reviewId }, data: { status } });
  await audit({ userId: user!.id, action: "STATUS_CHANGE", entityType: "REVIEW", entityId: reviewId, oldValues: { status: existing.status }, newValues: { status }, req });
  return ok({ success: true, message: `Review status updated to ${status}`, updated });
});

const deleteSchema = z.object({ reviewId: z.string().min(1).max(64) });

export const DELETE = handler({ permission: "reviews.moderate", limit: { max: 60, windowMs: 60_000 } }, async ({ user, req }) => {
  const { reviewId } = await parseJson(req, deleteSchema);
  const existing = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!existing) return fail(404, "Review not found.");
  await prisma.review.delete({ where: { id: reviewId } });
  await audit({
    userId: user!.id,
    action: "DELETE",
    entityType: "REVIEW",
    entityId: reviewId,
    oldValues: { productId: existing.productId, userId: existing.userId, rating: existing.rating, status: existing.status, comment: existing.comment },
    req,
  });
  return ok({ success: true, message: "Review deleted" });
});
