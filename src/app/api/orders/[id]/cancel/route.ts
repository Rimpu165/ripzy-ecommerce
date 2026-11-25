import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handler, parseJson, ok, fail } from "@/lib/api";
import { cancelOrder, CANCELLABLE } from "@/lib/orders";

const schema = z.object({ reason: z.string().trim().max(300).optional() });

/**
 * Customer self-cancel. Rule 6: only before SHIPPED. All stock/refund/notification
 * behaviour lives in the shared cancelOrder() so customer and admin paths never diverge.
 */
export const POST = handler<{ id: string }>(
  { auth: true, limit: { max: 20, windowMs: 60 * 60 * 1000, key: "order-cancel" } },
  async ({ user, req, params }) => {
    const { reason } = await parseJson(req, schema);

    // Ownership enforced server-side.
    const order = await prisma.order.findFirst({
      where: { id: params.id, userId: user!.id },
      select: { id: true, orderNumber: true, status: true },
    });
    if (!order) return fail(404, "Order not found.");
    if (!CANCELLABLE.includes(order.status)) {
      return fail(400, "This order can no longer be cancelled because it has already been shipped or closed.");
    }

    const result = await cancelOrder(order.id, {
      reason: reason || "Cancelled by customer",
      actor: { id: user!.id, name: user!.name },
    });

    const refundNote = result.refundTotal
      ? " Your refund has been initiated to the original payment method."
      : "";
    return ok({ success: true, message: `Order ${order.orderNumber} cancelled.${refundNote}` });
  }
);
