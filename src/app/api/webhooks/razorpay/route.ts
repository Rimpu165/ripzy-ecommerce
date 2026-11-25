import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { confirmOrderPayment } from "@/lib/orders";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

interface PaymentEntity {
  id?: string;
  order_id?: string;
  notes?: Record<string, string> | unknown[];
}

async function findPayment(e: PaymentEntity) {
  if (e.id) {
    const p = await prisma.payment.findFirst({ where: { pgPaymentId: e.id } });
    if (p) return p;
  }
  if (e.order_id) {
    const p = await prisma.payment.findFirst({ where: { pgOrderId: e.order_id } });
    if (p) return p;
  }
  const notes = e.notes && !Array.isArray(e.notes) ? (e.notes as Record<string, string>) : {};
  const num = notes.orderNumber || notes.order_number;
  if (num) {
    const order = await prisma.order.findUnique({ where: { orderNumber: num }, include: { payments: true } });
    return order?.payments.find((p) => p.paymentMethod !== "COD") ?? null;
  }
  return null;
}

export async function POST(req: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });

  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get("x-razorpay-signature"), secret)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  let body: { event?: string; payload?: { payment?: { entity?: PaymentEntity }; refund?: { entity?: { id?: string; payment_id?: string } } } };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  try {
    const event = body.event ?? "";
    if (event === "payment.captured") {
      const ent = body.payload?.payment?.entity ?? {};
      const p = await findPayment(ent);
      if (p) {
        // Idempotent: only acts while the order is PENDING_PAYMENT (or queues a late-payment refund once).
        await confirmOrderPayment(p.orderId, {
          pgOrderId: ent.order_id,
          pgPaymentId: ent.id,
          note: `Payment captured via Razorpay webhook (${ent.id ?? "n/a"})`,
          by: "Razorpay Webhook",
        });
      }
    } else if (event === "payment.failed") {
      const ent = body.payload?.payment?.entity ?? {};
      const p = await findPayment(ent);
      if (p) {
        await prisma.payment.updateMany({
          where: { id: p.id, status: "PENDING" },
          data: { status: "FAILED", pgPaymentId: ent.id ?? p.pgPaymentId, rawResponse: raw.slice(0, 5000) },
        });
      }
    } else if (event === "refund.processed") {
      const ent = body.payload?.refund?.entity ?? {};
      if (ent.id) {
        const r = await prisma.refund.updateMany({ where: { refundId: ent.id, status: { not: "PROCESSED" } }, data: { status: "PROCESSED" } });
        if (r.count) await audit({ action: "REFUND", entityType: "Refund", entityId: ent.id, newValues: { status: "PROCESSED", via: "webhook" } });
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[webhook:razorpay]", e);
    // 500 makes Razorpay retry; handlers above are idempotent.
    return NextResponse.json({ error: "Processing failed." }, { status: 500 });
  }
}
