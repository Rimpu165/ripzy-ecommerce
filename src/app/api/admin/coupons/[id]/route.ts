import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError, handler, ok, fail } from "@/lib/api";
import { audit } from "@/lib/audit";
import { couponBase, couponSchema } from "@/lib/marketing-schemas";

type P = { id: string };

/** Partial update: merges onto the stored coupon, then validates the merged result. */
export const PATCH = handler<P>(
  { permission: "coupons.manage", limit: { max: 60, windowMs: 60_000 } },
  async ({ user, req, params }) => {
    const existing = await prisma.coupon.findUnique({ where: { id: params.id } });
    if (!existing) return fail(404, "Coupon not found.");

    // Only keys actually present in the body override stored values (zod defaults must not clobber them).
    let raw: Record<string, unknown>;
    try {
      raw = await req.json();
    } catch {
      throw new ApiError(400, "Invalid JSON body.");
    }
    if (!raw || typeof raw !== "object") throw new ApiError(400, "Invalid JSON body.");
    const parsedPatch = couponBase.partial().safeParse(raw);
    if (!parsedPatch.success) throw new ApiError(400, parsedPatch.error.issues[0]?.message || "Invalid input.");
    const patch = parsedPatch.data;
    const pick = <K extends keyof typeof patch>(k: K, fallback: unknown) => (k in raw ? patch[k] : fallback);
    const merged = couponSchema.safeParse({
      code: pick("code", existing.code),
      description: pick("description", existing.description),
      discountType: pick("discountType", existing.discountType),
      discountValue: pick("discountValue", existing.discountValue),
      minOrderAmount: pick("minOrderAmount", existing.minOrderAmount),
      maxDiscountAmount: pick("maxDiscountAmount", existing.maxDiscountAmount),
      startsAt: ("startsAt" in raw ? (patch.startsAt ?? existing.startsAt) : existing.startsAt).toISOString(),
      expiresAt: "expiresAt" in raw ? (patch.expiresAt?.toISOString() ?? null) : (existing.expiresAt?.toISOString() ?? null),
      usageLimitTotal: pick("usageLimitTotal", existing.usageLimitTotal),
      usageLimitPerUser: pick("usageLimitPerUser", existing.usageLimitPerUser),
      isActive: pick("isActive", existing.isActive),
    });
    if (!merged.success) throw new ApiError(400, merged.error.issues[0]?.message || "Invalid input.");
    const data = merged.data;

    if (data.code !== existing.code && (await prisma.coupon.findUnique({ where: { code: data.code } }))) {
      return fail(409, `Coupon code ${data.code} already exists.`);
    }
    if (data.usageLimitTotal != null && data.usageLimitTotal < existing.usageCount) {
      return fail(400, `Total limit cannot be lower than the ${existing.usageCount} redemptions already used.`);
    }

    try {
      const coupon = await prisma.coupon.update({
        where: { id: existing.id },
        data: {
          code: data.code,
          description: data.description || null,
          discountType: data.discountType,
          discountValue: data.discountValue,
          minOrderAmount: data.minOrderAmount,
          maxDiscountAmount: data.discountType === "PERCENTAGE" ? (data.maxDiscountAmount ?? null) : null,
          startsAt: data.startsAt ?? existing.startsAt,
          expiresAt: data.expiresAt,
          usageLimitTotal: data.usageLimitTotal ?? null,
          usageLimitPerUser: data.usageLimitPerUser,
          isActive: data.isActive,
        },
      });
      await audit({ userId: user!.id, action: "UPDATE", entityType: "Coupon", entityId: coupon.id, oldValues: existing, newValues: coupon, req });
      return ok({ coupon });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return fail(409, "Coupon code already exists.");
      throw e;
    }
  }
);

export const DELETE = handler<P>(
  { permission: "coupons.manage", limit: { max: 30, windowMs: 60_000 } },
  async ({ user, req, params }) => {
    const existing = await prisma.coupon.findUnique({
      where: { id: params.id },
      include: { _count: { select: { usages: true } } },
    });
    if (!existing) return fail(404, "Coupon not found.");
    if (existing._count.usages > 0 || existing.usageCount > 0) {
      return fail(409, "This coupon has been used on orders and cannot be deleted. Deactivate it instead.");
    }
    await prisma.coupon.delete({ where: { id: existing.id } });
    await audit({ userId: user!.id, action: "DELETE", entityType: "Coupon", entityId: existing.id, oldValues: existing, req });
    return ok({ success: true });
  }
);
