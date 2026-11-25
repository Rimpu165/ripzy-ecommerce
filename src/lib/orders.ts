import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { notify } from "./notify";
import { publish } from "./events";
import { handleStockChange } from "./stock-alerts";
import { refundPayment } from "./razorpay";
import { ApiError } from "./api";

type Tx = Prisma.TransactionClient;

export interface Actor {
  id?: string | null;
  name: string;
}

export const ORDER_STATUSES = [
  "PENDING_PAYMENT",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** State machine (FR-AORD-02). REFUNDED is reached only through the refund flow. */
export const ORDER_TRANSITIONS: Record<string, string[]> = {
  PENDING_PAYMENT: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

/** Cancellation allowed until PROCESSING (Rule 6). */
export const CANCELLABLE = ["PENDING_PAYMENT", "CONFIRMED", "PROCESSING"];

export const canTransition = (from: string, to: string) => (ORDER_TRANSITIONS[from] ?? []).includes(to);

/** Transitions an admin can trigger manually from the UI/status API. */
export const manualTransitions = (from: string) => (ORDER_TRANSITIONS[from] ?? []).filter((s) => s !== "REFUNDED");

const round2 = (n: number) => Math.round(n * 100) / 100;
export const inr = (n: number) => `Rs. ${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

type OrderWithUser = { guestEmail: string | null; user?: { email: string; name: string } | null };
export const customerEmail = (o: OrderWithUser) => o.user?.email || o.guestEmail || null;

export function parseAddress(json: string | null | undefined): Record<string, string> {
  if (!json) return {};
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------- filters

export interface OrderFilters {
  status?: string;
  method?: string;
  from?: string;
  to?: string;
  q?: string;
}

export function buildOrderWhere(f: OrderFilters): Prisma.OrderWhereInput {
  const and: Prisma.OrderWhereInput[] = [];
  if (f.status && (ORDER_STATUSES as readonly string[]).includes(f.status)) and.push({ status: f.status });
  if (f.method === "COD" || f.method === "RAZORPAY") and.push({ payments: { some: { paymentMethod: f.method } } });
  const fromD = f.from ? new Date(f.from) : null;
  const toD = f.to ? new Date(f.to) : null;
  if (fromD && !isNaN(+fromD)) and.push({ placedAt: { gte: fromD } });
  if (toD && !isNaN(+toD)) {
    toD.setHours(23, 59, 59, 999);
    and.push({ placedAt: { lte: toD } });
  }
  const q = f.q?.trim();
  if (q) {
    and.push({
      OR: [
        { orderNumber: { contains: q } },
        { guestEmail: { contains: q } },
        { guestPhone: { contains: q } },
        { user: { is: { name: { contains: q } } } },
        { user: { is: { email: { contains: q } } } },
        { user: { is: { phone: { contains: q } } } },
      ],
    });
  }
  return and.length ? { AND: and } : {};
}

// ---------------------------------------------------------------- notifications

interface StatusMailCtx {
  courier?: string;
  tracking?: string;
  trackingUrl?: string | null;
  eta?: string;
  reason?: string;
  refund?: number;
}

type MailType = Parameters<typeof notify>[0]["type"];

const STATUS_MAIL: Record<string, { type: MailType; subject: (n: string) => string; body: (n: string, x: StatusMailCtx) => string }> = {
  CONFIRMED: {
    type: "ORDER_CONFIRMED",
    subject: (n) => `Your Ripzy order ${n} is confirmed`,
    body: (n) => `Good news! Order ${n} has been confirmed and will be prepared shortly.`,
  },
  PROCESSING: {
    type: "ORDER_CONFIRMED",
    subject: (n) => `Your Ripzy order ${n} is being prepared`,
    body: (n) => `Order ${n} is now being packed at our warehouse. We will notify you when it ships.`,
  },
  SHIPPED: {
    type: "SHIPPED",
    subject: (n) => `Your Ripzy order ${n} has shipped`,
    body: (n, x) =>
      `Order ${n} is on its way.` +
      (x.courier ? ` Courier: ${x.courier}.` : "") +
      (x.tracking ? ` Tracking number: ${x.tracking}.` : "") +
      (x.trackingUrl ? ` Track here: ${x.trackingUrl}` : "") +
      (x.eta ? ` Estimated delivery: ${x.eta}.` : ""),
  },
  DELIVERED: {
    type: "DELIVERED",
    subject: (n) => `Your Ripzy order ${n} was delivered`,
    body: (n) => `Order ${n} has been delivered. You can request a return within the return window.`,
  },
  CANCELLED: {
    type: "CANCELLED",
    subject: (n) => `Your Ripzy order ${n} was cancelled`,
    body: (n, x) =>
      `Order ${n} has been cancelled${x.reason ? `: ${x.reason}` : "."}${x.refund ? ` A refund of ${inr(x.refund)} has been initiated.` : ""}`,
  },
  REFUNDED: {
    type: "REFUND",
    subject: (n) => `Your Ripzy order ${n} has been refunded`,
    body: (n) => `Order ${n} has been fully refunded.`,
  },
};

async function mailStatus(
  order: OrderWithUser & { id: string; userId: string | null; orderNumber: string },
  status: string,
  ctx: StatusMailCtx = {}
) {
  const to = customerEmail(order);
  const tpl = STATUS_MAIL[status];
  if (!to || !tpl) return;
  await notify({
    userId: order.userId,
    to,
    type: tpl.type,
    subject: tpl.subject(order.orderNumber),
    content: tpl.body(order.orderNumber, ctx),
  });
}

function emitOrderUpdated(order: { id: string; orderNumber: string }, message: string) {
  publish({ type: "order.updated", title: `Order ${order.orderNumber}`, message, href: `/admin/orders/${order.id}` });
}

// ---------------------------------------------------------------- stock helpers

interface StockEffect {
  variantId: string;
  previousAvailable: number;
}

/** Give stock back (or release a reservation) for each item with an ORDER_CANCELLED ledger row. */
async function restoreItems(
  tx: Tx,
  order: { orderNumber: string; items: { variantId: string | null; quantity: number }[] },
  fromStatus: string,
  createdBy: string,
  reason: string,
  effects: StockEffect[]
) {
  const reservedOnly = fromStatus === "PENDING_PAYMENT";
  for (const item of order.items) {
    if (!item.variantId) continue;
    const v = await tx.productVariant.findUnique({ where: { id: item.variantId } });
    if (!v) continue;
    effects.push({ variantId: v.id, previousAvailable: v.stock - v.reservedStock });
    await tx.productVariant.update({
      where: { id: v.id },
      data: reservedOnly ? { reservedStock: { decrement: item.quantity } } : { stock: { increment: item.quantity } },
    });
    await tx.inventoryLedger.create({
      data: {
        variantId: v.id,
        changeQty: item.quantity,
        previousStock: v.stock,
        newStock: reservedOnly ? v.stock : v.stock + item.quantity,
        reason,
        referenceId: order.orderNumber,
        createdBy,
      },
    });
  }
}

async function afterStock(effects: StockEffect[]) {
  for (const e of effects) {
    try {
      await handleStockChange(e.variantId, e.previousAvailable);
    } catch (err) {
      console.error("[orders] handleStockChange failed", err);
    }
  }
}

// ---------------------------------------------------------------- cancel

/**
 * Cancels an order (<= PROCESSING). Restores stock / releases the reservation with
 * InventoryLedger ORDER_CANCELLED rows and, if prepaid and paid, creates INITIATED
 * Refund rows (Rule 8). A second call throws 409.
 */
export async function cancelOrder(orderId: string, opts: { reason: string; actor: Actor }) {
  const effects: StockEffect[] = [];
  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true, payments: { include: { refunds: true } }, user: { select: { email: true, name: true } } },
    });
    if (!order) throw new ApiError(404, "Order not found.");
    if (!CANCELLABLE.includes(order.status)) {
      throw new ApiError(409, `Order in '${order.status}' status can no longer be cancelled.`);
    }
    const claimed = await tx.order.updateMany({
      where: { id: order.id, status: order.status },
      data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: opts.reason },
    });
    if (claimed.count !== 1) throw new ApiError(409, "Order was modified concurrently. Please retry.");

    await restoreItems(tx, order, order.status, opts.actor.id || "SYSTEM", "ORDER_CANCELLED", effects);

    let refundTotal = 0;
    const refunds: string[] = [];
    for (const p of order.payments) {
      if (p.status === "SUCCESS" && p.paymentMethod !== "COD") {
        const used = p.refunds.filter((r) => r.status !== "FAILED").reduce((s, r) => s + r.amount, 0);
        const remaining = round2(p.amount - used);
        if (remaining > 0) {
          const r = await tx.refund.create({
            data: { orderId: order.id, paymentId: p.id, amount: remaining, reason: `Order cancelled: ${opts.reason}`, status: "INITIATED" },
          });
          refunds.push(r.id);
          refundTotal += remaining;
        }
      } else if (p.status === "PENDING") {
        await tx.payment.update({ where: { id: p.id }, data: { status: "FAILED" } });
      }
    }

    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: "CANCELLED",
        note: `Cancelled by ${opts.actor.name}: ${opts.reason}${refundTotal ? ` (refund ${inr(refundTotal)} initiated)` : ""}`,
        createdBy: opts.actor.name,
      },
    });
    return { order, from: order.status, refundTotal, refunds };
  });

  await afterStock(effects);
  await mailStatus(result.order, "CANCELLED", { reason: opts.reason, refund: result.refundTotal || undefined });
  emitOrderUpdated(result.order, `Cancelled (${opts.reason})`);
  return result;
}

// ---------------------------------------------------------------- transitions

export interface ShipmentInput {
  courierName: string;
  trackingNumber: string;
  trackingUrl?: string | null;
  estimatedDelivery?: Date | null;
}

/** Validated transition. CANCELLED is delegated to cancelOrder; REFUNDED is refused. */
export async function transitionOrder(
  orderId: string,
  to: string,
  opts: { actor: Actor; note?: string; shipment?: ShipmentInput | null }
) {
  if (to === "CANCELLED") {
    const r = await cancelOrder(orderId, { reason: opts.note || "Cancelled by admin", actor: opts.actor });
    return { order: r.order, from: r.from };
  }
  if (to === "REFUNDED") throw new ApiError(400, "Use the refund action to refund an order.");

  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true, user: { select: { email: true, name: true } } },
    });
    if (!order) throw new ApiError(404, "Order not found.");
    if (!canTransition(order.status, to)) {
      throw new ApiError(400, `Cannot transition order from '${order.status}' to '${to}'.`);
    }
    const data: Prisma.OrderUpdateManyMutationInput = { status: to };
    if (to === "SHIPPED") data.shippedAt = new Date();
    if (to === "DELIVERED") data.deliveredAt = new Date();
    const claimed = await tx.order.updateMany({ where: { id: order.id, status: order.status }, data });
    if (claimed.count !== 1) throw new ApiError(409, "Order was modified concurrently. Please retry.");

    if (to === "CONFIRMED") {
      // Manual confirmation of a reserved order: convert reservation into a real deduction.
      for (const item of order.items) {
        if (!item.variantId) continue;
        const v = await tx.productVariant.findUnique({ where: { id: item.variantId } });
        if (!v) continue;
        await tx.productVariant.update({
          where: { id: v.id },
          data: { stock: { decrement: item.quantity }, reservedStock: { decrement: item.quantity } },
        });
        await tx.inventoryLedger.create({
          data: {
            variantId: v.id,
            changeQty: -item.quantity,
            previousStock: v.stock,
            newStock: v.stock - item.quantity,
            reason: "ORDER_CONFIRMED",
            referenceId: order.orderNumber,
            createdBy: opts.actor.id || "SYSTEM",
          },
        });
      }
    }
    if (to === "DELIVERED") {
      // COD collected on delivery (FR-AORD-07)
      await tx.payment.updateMany({ where: { orderId: order.id, paymentMethod: "COD", status: "PENDING" }, data: { status: "SUCCESS" } });
      await tx.order.update({ where: { id: order.id }, data: { paidAt: order.paidAt ?? new Date() } });
      await tx.shipment.updateMany({ where: { orderId: order.id, deliveredAt: null }, data: { deliveredAt: new Date() } });
    }
    if (to === "SHIPPED" && opts.shipment) {
      await tx.shipment.create({ data: { orderId: order.id, ...opts.shipment, shippedAt: new Date() } });
    }
    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: to,
        note: opts.note || `Status changed from ${order.status} to ${to} by ${opts.actor.name}`,
        createdBy: opts.actor.name,
      },
    });
    return { order, from: order.status };
  });

  const s = opts.shipment;
  await mailStatus(result.order, to, {
    courier: s?.courierName,
    tracking: s?.trackingNumber,
    trackingUrl: s?.trackingUrl,
    eta: s?.estimatedDelivery?.toLocaleDateString("en-IN"),
  });
  emitOrderUpdated(result.order, `${result.from} -> ${to}`);
  return result;
}

/** Update/add shipment details for an already-SHIPPED order (no status change). */
export async function upsertShipment(orderId: string, s: ShipmentInput, actor: Actor) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { shipments: true, user: { select: { email: true, name: true } } },
  });
  if (!order) throw new ApiError(404, "Order not found.");
  if (order.status !== "SHIPPED") throw new ApiError(400, "Shipment can only be edited for SHIPPED orders.");
  const existing = order.shipments[0];
  await prisma.$transaction([
    existing
      ? prisma.shipment.update({ where: { id: existing.id }, data: { ...s } })
      : prisma.shipment.create({ data: { orderId, ...s } }),
    prisma.orderStatusHistory.create({
      data: { orderId, status: "SHIPPED", note: `Shipment updated: ${s.courierName} ${s.trackingNumber}`, createdBy: actor.name },
    }),
  ]);
  await mailStatus(order, "SHIPPED", {
    courier: s.courierName,
    tracking: s.trackingNumber,
    trackingUrl: s.trackingUrl,
    eta: s.estimatedDelivery?.toLocaleDateString("en-IN"),
  });
  emitOrderUpdated(order, "Shipment updated");
  return order;
}

/** Payment captured (webhook): reservation -> real deduction, order CONFIRMED. Idempotent. */
export async function confirmOrderPayment(
  orderId: string,
  pg: { pgOrderId?: string | null; pgPaymentId?: string | null; note: string; by: string }
) {
  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true, payments: true, user: { select: { email: true, name: true } } },
    });
    if (!order) return null;
    const payment = order.payments.find((p) => p.paymentMethod !== "COD") ?? order.payments[0];
    if (order.status !== "PENDING_PAYMENT") {
      // If the order was cancelled before the money arrived, queue a refund once.
      if (order.status === "CANCELLED" && payment && payment.status !== "SUCCESS") {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: "SUCCESS", pgPaymentId: pg.pgPaymentId ?? payment.pgPaymentId, pgOrderId: pg.pgOrderId ?? payment.pgOrderId },
        });
        await tx.refund.create({
          data: { orderId: order.id, paymentId: payment.id, amount: payment.amount, reason: "Payment captured after order was cancelled", status: "INITIATED" },
        });
        await tx.orderStatusHistory.create({
          data: { orderId: order.id, status: "CANCELLED", note: "Late payment captured; refund initiated.", createdBy: pg.by },
        });
      }
      return null;
    }
    await tx.order.update({ where: { id: order.id }, data: { status: "CONFIRMED", paidAt: new Date() } });
    if (payment) {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: "SUCCESS", pgOrderId: pg.pgOrderId ?? payment.pgOrderId, pgPaymentId: pg.pgPaymentId ?? payment.pgPaymentId },
      });
    }
    for (const item of order.items) {
      if (!item.variantId) continue;
      const v = await tx.productVariant.findUnique({ where: { id: item.variantId } });
      if (!v) continue;
      await tx.productVariant.update({
        where: { id: v.id },
        data: { stock: { decrement: item.quantity }, reservedStock: { decrement: item.quantity } },
      });
      await tx.inventoryLedger.create({
        data: {
          variantId: v.id,
          changeQty: -item.quantity,
          previousStock: v.stock,
          newStock: v.stock - item.quantity,
          reason: "ORDER_CONFIRMED",
          referenceId: order.orderNumber,
          createdBy: pg.by,
        },
      });
    }
    await tx.orderStatusHistory.create({ data: { orderId: order.id, status: "CONFIRMED", note: pg.note, createdBy: pg.by } });
    return order;
  });
  if (result) {
    await mailStatus(result, "CONFIRMED");
    emitOrderUpdated(result, "Payment confirmed");
  }
  return result;
}

// ---------------------------------------------------------------- refunds

const MANUAL_TAG = "manual reconciliation";

/** Executes a refund row: Razorpay for prepaid (Rule 8), manual reconciliation for COD. */
async function settleRefund(refundRowId: string, actor: Actor, markManualDone: boolean) {
  const row = await prisma.refund.findUnique({ where: { id: refundRowId }, include: { payment: true } });
  if (!row) throw new ApiError(404, "Refund not found.");
  if (row.status === "PROCESSED") return row;
  const isCod = row.payment?.paymentMethod === "COD";
  if (isCod) {
    if (!markManualDone) return row; // stays INITIATED until finance reconciles
    return prisma.refund.update({ where: { id: row.id }, data: { status: "PROCESSED" } });
  }
  try {
    const r = await refundPayment({
      paymentId: row.payment?.pgPaymentId ?? null,
      amount: row.amount,
      notes: { orderId: row.orderId, refundRow: row.id, by: actor.name },
    });
    return await prisma.refund.update({
      where: { id: row.id },
      data: { status: r.status === "processed" ? "PROCESSED" : "INITIATED", refundId: r.id },
    });
  } catch (e) {
    await prisma.refund.update({
      where: { id: row.id },
      data: { status: "FAILED", reason: `${row.reason ?? ""} [gateway error: ${(e as Error).message}]`.slice(0, 500) },
    });
    throw new ApiError(502, `Gateway refund failed: ${(e as Error).message}`);
  }
}

/**
 * Create (or settle an existing INITIATED) refund. Amount must be <= remaining refundable on the payment.
 * When the order is fully refunded it moves to REFUNDED with history + notification.
 */
export async function issueRefund(input: {
  orderId: string;
  paymentId?: string | null;
  amount?: number;
  reason: string;
  actor: Actor;
  refundRowId?: string;
  markManualDone?: boolean;
}) {
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: { payments: { include: { refunds: true } }, user: { select: { email: true, name: true } } },
  });
  if (!order) throw new ApiError(404, "Order not found.");

  let rowId = input.refundRowId;
  if (rowId) {
    const existing = order.payments.flatMap((p) => p.refunds).find((r) => r.id === rowId);
    if (!existing) throw new ApiError(404, "Refund not found on this order.");
  } else {
    const payment = input.paymentId
      ? order.payments.find((p) => p.id === input.paymentId)
      : order.payments.find((p) => p.status === "SUCCESS");
    if (!payment) throw new ApiError(400, "No paid payment found on this order to refund.");
    if (payment.status !== "SUCCESS") throw new ApiError(400, "Payment has not been collected; nothing to refund.");
    const used = payment.refunds.filter((r) => r.status !== "FAILED").reduce((s, r) => s + r.amount, 0);
    const remaining = round2(payment.amount - used);
    const amount = round2(input.amount ?? remaining);
    if (!(amount > 0)) throw new ApiError(400, "Nothing left to refund on this payment.");
    if (amount > remaining + 0.001) throw new ApiError(400, `Amount exceeds refundable balance (${inr(remaining)}).`);
    const isCod = payment.paymentMethod === "COD";
    const row = await prisma.refund.create({
      data: {
        orderId: order.id,
        paymentId: payment.id,
        amount,
        reason: isCod ? `${input.reason} [${MANUAL_TAG}]` : input.reason,
        status: "INITIATED",
      },
    });
    rowId = row.id;
  }

  const settled = await settleRefund(rowId, input.actor, !!input.markManualDone);

  // Is the order now fully refunded?
  const fresh = await prisma.order.findUnique({
    where: { id: order.id },
    include: { payments: { include: { refunds: true } } },
  });
  let orderRefunded = false;
  if (fresh) {
    const paid = fresh.payments.filter((p) => p.status === "SUCCESS").reduce((s, p) => s + p.amount, 0);
    const counted = fresh.payments
      .flatMap((p) => p.refunds.map((r) => ({ r, cod: p.paymentMethod === "COD" })))
      .filter(({ r, cod }) => r.status === "PROCESSED" || (cod && r.status === "INITIATED"))
      .reduce((s, { r }) => s + r.amount, 0);
    if (paid > 0 && counted + 0.001 >= paid && !["REFUNDED", "CANCELLED", "PENDING_PAYMENT"].includes(fresh.status)) {
      const claimed = await prisma.order.updateMany({ where: { id: fresh.id, status: fresh.status }, data: { status: "REFUNDED" } });
      if (claimed.count === 1) {
        await prisma.orderStatusHistory.create({
          data: { orderId: fresh.id, status: "REFUNDED", note: `Fully refunded (${inr(counted)})`, createdBy: input.actor.name },
        });
        orderRefunded = true;
      }
    }
  }

  const to = customerEmail(order);
  if (to) {
    await notify({
      userId: order.userId,
      to,
      type: "REFUND",
      subject: `Refund of ${inr(settled.amount)} for order ${order.orderNumber}`,
      content:
        settled.status === "PROCESSED"
          ? `We have refunded ${inr(settled.amount)} for order ${order.orderNumber} to your original payment method. It can take 5-7 business days to reflect.`
          : `A refund of ${inr(settled.amount)} for order ${order.orderNumber} has been initiated. Our team will reconcile it with you shortly.`,
    });
  }
  emitOrderUpdated(order, `Refund ${inr(settled.amount)} ${settled.status.toLowerCase()}${orderRefunded ? " (order refunded)" : ""}`);
  return { refund: settled, orderRefunded };
}

// ---------------------------------------------------------------- returns restock

/** Put returned items back into stock with RETURN ledger rows. */
export async function restockReturnedItems(orderId: string, actor: Actor) {
  const effects: StockEffect[] = [];
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) throw new ApiError(404, "Order not found.");
    for (const item of order.items) {
      if (!item.variantId) continue;
      const v = await tx.productVariant.findUnique({ where: { id: item.variantId } });
      if (!v) continue;
      effects.push({ variantId: v.id, previousAvailable: v.stock - v.reservedStock });
      await tx.productVariant.update({ where: { id: v.id }, data: { stock: { increment: item.quantity } } });
      await tx.inventoryLedger.create({
        data: {
          variantId: v.id,
          changeQty: item.quantity,
          previousStock: v.stock,
          newStock: v.stock + item.quantity,
          reason: "RETURN",
          referenceId: order.orderNumber,
          createdBy: actor.id || actor.name,
        },
      });
    }
  });
  await afterStock(effects);
}
