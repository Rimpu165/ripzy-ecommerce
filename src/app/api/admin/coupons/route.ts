import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { handler, parseJson, ok, fail } from "@/lib/api";
import { audit } from "@/lib/audit";
import { couponSchema } from "@/lib/marketing-schemas";

export const GET = handler({ permission: "coupons.manage" }, async () => {
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  return ok({ coupons });
});

export const POST = handler({ permission: "coupons.manage", limit: { max: 60, windowMs: 60_000 } }, async ({ user, req }) => {
  const data = await parseJson(req, couponSchema);
  if (await prisma.coupon.findUnique({ where: { code: data.code } })) {
    return fail(409, `Coupon code ${data.code} already exists.`);
  }
  try {
    const coupon = await prisma.coupon.create({
      data: {
        code: data.code,
        description: data.description || null,
        discountType: data.discountType,
        discountValue: data.discountValue,
        minOrderAmount: data.minOrderAmount,
        maxDiscountAmount: data.discountType === "PERCENTAGE" ? (data.maxDiscountAmount ?? null) : null,
        startsAt: data.startsAt ?? new Date(),
        expiresAt: data.expiresAt,
        usageLimitTotal: data.usageLimitTotal ?? null,
        usageLimitPerUser: data.usageLimitPerUser,
        isActive: data.isActive,
      },
    });
    await audit({ userId: user!.id, action: "CREATE", entityType: "Coupon", entityId: coupon.id, newValues: coupon, req });
    return ok({ coupon }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return fail(409, `Coupon code ${data.code} already exists.`);
    }
    throw e;
  }
});
