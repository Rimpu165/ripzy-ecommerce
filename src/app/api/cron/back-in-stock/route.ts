import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import { env } from "@/lib/env";
import { cronGuard } from "../_auth";

export const dynamic = "force-dynamic";

/** Hourly sweep (FR-NOTIF-03): notify pending StockAlerts whose variant is available again. Idempotent via notifiedAt claim. */
async function run(req: Request) {
  const denied = cronGuard(req);
  if (denied) return denied;

  const alerts = await prisma.stockAlert.findMany({
    where: { notifiedAt: null },
    include: { variant: { include: { product: { select: { name: true, slug: true, deletedAt: true } } } } },
    take: 1000,
  });

  let sent = 0;
  for (const a of alerts) {
    const v = a.variant;
    if (v.stock - v.reservedStock <= 0 || v.product.deletedAt) continue;
    // Claim first so overlapping runs cannot double-send.
    const claimed = await prisma.stockAlert.updateMany({ where: { id: a.id, notifiedAt: null }, data: { notifiedAt: new Date() } });
    if (claimed.count !== 1) continue;
    await notify({
      userId: a.userId,
      to: a.email,
      type: "BACK_IN_STOCK",
      subject: `${v.product.name} is back in stock`,
      content: `Good news! ${v.product.name} (${v.title}) is available again: ${env.siteUrl}/products/${v.product.slug}`,
    });
    sent++;
  }
  console.log(`[cron:back-in-stock] pending=${alerts.length} notified=${sent}`);
  return NextResponse.json({ ok: true, pending: alerts.length, notified: sent });
}

export const GET = run;
export const POST = run;
