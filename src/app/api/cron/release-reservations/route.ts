import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getNumberSetting } from "@/lib/settings";
import { cancelOrder } from "@/lib/orders";
import { ApiError } from "@/lib/api";
import { cronGuard } from "../_auth";

export const dynamic = "force-dynamic";

/** Hourly: cancel PENDING_PAYMENT orders past the reservation TTL and release reserved stock. Idempotent. */
async function run(req: Request) {
  const denied = cronGuard(req);
  if (denied) return denied;

  const minutes = await getNumberSetting("order.stockReservationMinutes");
  const cutoff = new Date(Date.now() - minutes * 60_000);
  const stale = await prisma.order.findMany({
    where: { status: "PENDING_PAYMENT", placedAt: { lt: cutoff } },
    select: { id: true, orderNumber: true },
    take: 500,
  });

  let released = 0;
  const skipped: string[] = [];
  for (const o of stale) {
    try {
      await cancelOrder(o.id, { reason: `Payment not completed within ${minutes} minutes`, actor: { name: "System (cron)" } });
      released++;
    } catch (e) {
      // 409 = already handled by a concurrent run / payment arrived; anything else is logged.
      if (!(e instanceof ApiError && e.status === 409)) console.error("[cron:release-reservations]", o.orderNumber, e);
      skipped.push(o.orderNumber);
    }
  }
  console.log(`[cron:release-reservations] released=${released} skipped=${skipped.length} ttl=${minutes}m`);
  return NextResponse.json({ ok: true, released, skipped });
}

export const GET = run;
export const POST = run;
