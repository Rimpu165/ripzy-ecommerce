import { z } from "zod";
import { handler, ok, parseJson, ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { transitionOrder } from "@/lib/orders";

const schema = z.object({
  orderIds: z.array(z.string().min(1)).min(1, "Select at least one order.").max(100),
  action: z.literal("PROCESSING"),
});

/** Bulk "Mark as processing" for CONFIRMED orders. Each order is validated independently. */
export const POST = handler({ permission: "orders.update", limit: { max: 30, windowMs: 60_000 } }, async ({ user, req }) => {
  const b = await parseJson(req, schema);
  if (!user) throw new ApiError(401, "Authentication required");
  const updated: string[] = [];
  const failed: { id: string; error: string }[] = [];
  for (const id of b.orderIds) {
    try {
      await transitionOrder(id, "PROCESSING", { actor: { id: user.id, name: user.name }, note: `Bulk marked as processing by ${user.name}` });
      updated.push(id);
    } catch (e) {
      failed.push({ id, error: e instanceof ApiError ? e.message : "Failed" });
    }
  }
  await audit({ userId: user.id, action: "STATUS_CHANGE", entityType: "Order", entityId: "bulk", newValues: { to: "PROCESSING", updated, failed }, req });
  return ok({ success: true, updated: updated.length, failed });
});
