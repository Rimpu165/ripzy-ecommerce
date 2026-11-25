import { z } from "zod";
import { handler, ok, parseJson, ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { cancelOrder } from "@/lib/orders";

const schema = z.object({ orderId: z.string().min(1), reason: z.string().trim().min(3, "A cancellation reason is required.").max(300) });

export const POST = handler({ permission: "orders.update", limit: { max: 60, windowMs: 60_000 } }, async ({ user, req }) => {
  const b = await parseJson(req, schema);
  if (!user) throw new ApiError(401, "Authentication required");
  const r = await cancelOrder(b.orderId, { reason: b.reason, actor: { id: user.id, name: user.name } });
  await audit({
    userId: user.id,
    action: "STATUS_CHANGE",
    entityType: "Order",
    entityId: b.orderId,
    oldValues: { status: r.from },
    newValues: { status: "CANCELLED", reason: b.reason, refundInitiated: r.refundTotal },
    req,
  });
  return ok({ success: true, refundInitiated: r.refundTotal });
});
