import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import { env } from "@/lib/env";
import { cronGuard } from "../_auth";

export const dynamic = "force-dynamic";

const HOUR = 3_600_000;

/** Daily (FR-NOTIF-02): remind users whose cart sat untouched 24h-7d; at most one reminder per 72h. */
async function run(req: Request) {
  const denied = cronGuard(req);
  if (denied) return denied;

  const now = Date.now();
  const idleBefore = new Date(now - 24 * HOUR);
  const notTooOld = new Date(now - 7 * 24 * HOUR);
  const dedupeSince = new Date(now - 72 * HOUR);

  const carts = await prisma.cart.findMany({
    where: {
      userId: { not: null },
      updatedAt: { lt: idleBefore, gt: notTooOld },
      items: { some: {}, none: { updatedAt: { gte: idleBefore } } },
    },
    include: {
      user: { select: { id: true, email: true, name: true, deletedAt: true, isBlocked: true } },
      items: { include: { variant: { include: { product: { select: { name: true } } } } } },
    },
    take: 500,
  });

  let sent = 0;
  for (const c of carts) {
    const u = c.user;
    if (!u?.email || u.deletedAt || u.isBlocked) continue;
    const recent = await prisma.notification.findFirst({
      where: { recipientEmail: u.email, type: "ABANDONED_CART", createdAt: { gte: dedupeSince } },
      select: { id: true },
    });
    if (recent) continue;
    const names = c.items.slice(0, 3).map((i) => i.variant.product.name).join(", ");
    const more = c.items.length > 3 ? ` and ${c.items.length - 3} more` : "";
    await notify({
      userId: u.id,
      to: u.email,
      type: "ABANDONED_CART",
      subject: "You left something in your Ripzy cart",
      content: `Hi ${u.name}, your cart still has ${names}${more}. Complete your order: ${env.siteUrl}/checkout`,
    });
    sent++;
  }
  console.log(`[cron:abandoned-carts] candidates=${carts.length} sent=${sent}`);
  return NextResponse.json({ ok: true, candidates: carts.length, sent });
}

export const GET = run;
export const POST = run;
