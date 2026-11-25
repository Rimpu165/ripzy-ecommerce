import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CouponsClient, { type CouponRow, type RecentUsage } from "@/components/admin/marketing/CouponsClient";

export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  if (!(await getAdminUser("coupons.manage"))) redirect("/admin");

  const [coupons, sums, customers, recent] = await Promise.all([
    prisma.coupon.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.couponUsage.groupBy({ by: ["couponId"], _sum: { discountAmount: true } }),
    prisma.couponUsage.groupBy({ by: ["couponId", "userId"] }),
    prisma.couponUsage.findMany({
      orderBy: { usedAt: "desc" },
      take: 15,
      include: {
        coupon: { select: { code: true } },
        order: { select: { orderNumber: true, guestEmail: true } },
        user: { select: { email: true } },
      },
    }),
  ]);

  const sumMap = new Map(sums.map((s) => [s.couponId, s._sum.discountAmount ?? 0]));
  const custMap = new Map<string, number>();
  for (const c of customers) custMap.set(c.couponId, (custMap.get(c.couponId) ?? 0) + 1);

  const rows: CouponRow[] = coupons.map((c) => ({
    id: c.id,
    code: c.code,
    description: c.description,
    discountType: c.discountType,
    discountValue: c.discountValue,
    minOrderAmount: c.minOrderAmount,
    maxDiscountAmount: c.maxDiscountAmount,
    startsAt: c.startsAt.toISOString(),
    expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
    usageLimitTotal: c.usageLimitTotal,
    usageLimitPerUser: c.usageLimitPerUser,
    usageCount: c.usageCount,
    isActive: c.isActive,
    totalDiscount: sumMap.get(c.id) ?? 0,
    uniqueCustomers: custMap.get(c.id) ?? 0,
  }));

  const recentRows: RecentUsage[] = recent.map((u) => ({
    id: u.id,
    code: u.coupon.code,
    orderNumber: u.order.orderNumber,
    customer: u.user?.email ?? u.order.guestEmail ?? "Guest",
    amount: u.discountAmount,
    usedAt: u.usedAt.toISOString(),
  }));

  return <CouponsClient coupons={rows} recent={recentRows} />;
}
