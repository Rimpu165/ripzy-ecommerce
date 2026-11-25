import { z } from "zod";
import { handler, ok, parseJson, ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { issueRefund } from "@/lib/orders";

const schema = z.object({
  orderId: z.string().min(1),
  paymentId: z.string().min(1).optional(),
  amount: z.number().positive().max(10_000_000).optional(), // omitted = full remaining
  reason: z.string().trim().min(3, "A refund reason is required.").max(300),
  /** Settle an existing INITIATED refund row (e.g. created by order cancellation). */
  refundRowId: z.string().min(1).optional(),
  /** COD only: confirm the manual payout has been done. */
  markManualDone: z.boolean().optional(),
});

export const POST = handler({ permission: "orders.refund", limit: { max: 30, windowMs: 60_000 } }, async ({ user, req }) => {
  const b = await parseJson(req, schema);
  if (!user) throw new ApiError(401, "Authentication required");
  const { refund, orderRefunded } = await issueRefund({ ...b, actor: { id: user.id, name: user.name } });
  await audit({
    userId: user.id,
    action: "REFUND",
    entityType: "Refund",
    entityId: refund.id,
    newValues: { orderId: b.orderId, amount: refund.amount, status: refund.status, reason: b.reason, orderRefunded },
    req,
  });
  return ok({ success: true, refund, orderRefunded });
});
