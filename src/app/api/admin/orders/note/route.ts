import { z } from "zod";
import { handler, ok, parseJson, ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

const schema = z.object({ orderId: z.string().min(1), note: z.string().trim().min(1, "Note is empty.").max(1000) });

/** Internal note: stored in OrderStatusHistory (status = current status, note prefixed). Not sent to the customer. */
export const POST = handler({ permission: "orders.update", limit: { max: 60, windowMs: 60_000 } }, async ({ user, req }) => {
  const b = await parseJson(req, schema);
  if (!user) throw new ApiError(401, "Authentication required");
  const order = await prisma.order.findUnique({ where: { id: b.orderId }, select: { id: true, status: true } });
  if (!order) throw new ApiError(404, "Order not found.");
  await prisma.orderStatusHistory.create({
    data: { orderId: order.id, status: order.status, note: `[INTERNAL NOTE] ${b.note}`, createdBy: user.name },
  });
  await audit({ userId: user.id, action: "UPDATE", entityType: "Order", entityId: order.id, newValues: { internalNote: b.note }, req });
  return ok({ success: true });
});
