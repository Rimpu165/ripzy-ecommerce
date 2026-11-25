import { z } from "zod";
import { handler, ok, parseJson, ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import { publish } from "@/lib/events";
import { can } from "@/lib/rbac";
import { customerEmail, inr, issueRefund, restockReturnedItems } from "@/lib/orders";

const schema = z.object({
  returnId: z.string().min(1),
  action: z.enum(["APPROVE", "REJECT", "RECEIVE", "REFUND"]),
  note: z.string().trim().max(500).optional(),
  restock: z.boolean().optional(),
  amount: z.number().positive().max(10_000_000).optional(),
});

const FROM: Record<string, string> = { APPROVE: "REQUESTED", REJECT: "REQUESTED", RECEIVE: "APPROVED", REFUND: "RECEIVED" };
const TO: Record<string, string> = { APPROVE: "APPROVED", REJECT: "REJECTED", RECEIVE: "RECEIVED", REFUND: "REFUNDED" };

export const POST = handler({ permission: "returns.manage", limit: { max: 60, windowMs: 60_000 } }, async ({ user, req }) => {
  const b = await parseJson(req, schema);
  if (!user) throw new ApiError(401, "Authentication required");
  if (b.action === "REFUND" && !can(user.role, "orders.refund")) throw new ApiError(403, "Refunds require the 'orders.refund' permission.");
  if (b.action === "REJECT" && !b.note) throw new ApiError(400, "An admin note is required when rejecting a return.");

  const rr = await prisma.returnRequest.findUnique({
    where: { id: b.returnId },
    include: { order: { include: { user: { select: { email: true, name: true } }, payments: { include: { refunds: true } } } } },
  });
  if (!rr) throw new ApiError(404, "Return request not found.");
  if (rr.status !== FROM[b.action]) {
    throw new ApiError(409, `Return is '${rr.status}'; ${b.action} requires '${FROM[b.action]}'.`);
  }
  const actor = { id: user.id, name: user.name };
  const order = rr.order;
  let refundAmount = rr.refundAmount;
  let refundNote = "";

  if (b.action === "RECEIVE" && b.restock) await restockReturnedItems(order.id, actor);

  if (b.action === "REFUND") {
    const payment = order.payments.find((p) => p.status === "SUCCESS");
    if (!payment) throw new ApiError(400, "Order has no collected payment to refund.");
    const used = payment.refunds.filter((r) => r.status !== "FAILED").reduce((s, r) => s + r.amount, 0);
    const remaining = Math.round((payment.amount - used) * 100) / 100;
    const amount = b.amount ?? rr.refundAmount ?? remaining;
    const res = await issueRefund({
      orderId: order.id,
      paymentId: payment.id,
      amount,
      reason: `Return ${rr.id.slice(-6)}: ${rr.reason}`,
      actor,
    });
    refundAmount = res.refund.amount;
    refundNote = res.refund.status === "PROCESSED" ? "Refund processed." : "Refund initiated (manual reconciliation).";
  }

  // Guard against a concurrent action on the same request.
  const claimed = await prisma.returnRequest.updateMany({
    where: { id: rr.id, status: rr.status },
    data: { status: TO[b.action], adminNote: b.note || rr.adminNote, refundAmount },
  });
  if (claimed.count !== 1) throw new ApiError(409, "Return was updated by someone else. Refresh and retry.");

  await prisma.orderStatusHistory.create({
    data: {
      orderId: order.id,
      status: order.status,
      note: `[RETURN ${TO[b.action]}] ${b.note ?? ""}${b.action === "RECEIVE" && b.restock ? " (items restocked)" : ""}${refundNote ? ` ${refundNote}` : ""}`.trim(),
      createdBy: user.name,
    },
  });

  const to = customerEmail(order);
  if (to && b.action !== "REFUND") {
    const msg: Record<string, string> = {
      APPROVE: `Your return request for order ${order.orderNumber} has been approved. Please ship the items back as instructed by support.${b.note ? ` Note: ${b.note}` : ""}`,
      REJECT: `Your return request for order ${order.orderNumber} was not approved. Reason: ${b.note}`,
      RECEIVE: `We have received the returned items for order ${order.orderNumber}. Your refund will be processed shortly.`,
    };
    await notify({
      userId: order.userId,
      to,
      type: "RETURN",
      subject: `Return update for order ${order.orderNumber}: ${TO[b.action]}`,
      content: msg[b.action],
    });
  }
  // REFUND notification (type REFUND) is sent by issueRefund; add a RETURN-type note too.
  if (to && b.action === "REFUND" && refundAmount) {
    await notify({
      userId: order.userId,
      to,
      type: "RETURN",
      subject: `Return completed for order ${order.orderNumber}`,
      content: `Your return is complete and ${inr(refundAmount)} has been refunded.`,
    });
  }

  publish({ type: "order.updated", title: `Return ${TO[b.action]}`, message: `Order ${order.orderNumber}`, href: "/admin/returns" });
  await audit({
    userId: user.id,
    action: b.action === "REFUND" ? "REFUND" : "STATUS_CHANGE",
    entityType: "ReturnRequest",
    entityId: rr.id,
    oldValues: { status: rr.status },
    newValues: { status: TO[b.action], note: b.note, restock: b.restock, refundAmount },
    req,
  });
  return ok({ success: true, status: TO[b.action] });
});
