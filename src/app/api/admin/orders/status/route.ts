import { z } from "zod";
import { handler, ok, parseJson, ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { transitionOrder } from "@/lib/orders";

const schema = z.object({
  orderId: z.string().min(1),
  newStatus: z.enum(["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"]),
  note: z.string().trim().max(500).optional(),
  courierName: z.string().trim().max(100).optional(),
  trackingNumber: z.string().trim().max(100).optional(),
  trackingUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
  estimatedDelivery: z.string().optional(),
});

export const POST = handler({ permission: "orders.update", limit: { max: 120, windowMs: 60_000 } }, async ({ user, req }) => {
  const b = await parseJson(req, schema);
  if (!user) throw new ApiError(401, "Authentication required");

  const eta = b.estimatedDelivery ? new Date(b.estimatedDelivery) : null;
  if (eta && isNaN(+eta)) throw new ApiError(400, "Invalid estimated delivery date.");

  const shipment =
    b.newStatus === "SHIPPED" && b.trackingNumber
      ? {
          courierName: b.courierName || "Courier",
          trackingNumber: b.trackingNumber,
          trackingUrl: b.trackingUrl || null,
          estimatedDelivery: eta,
        }
      : null;

  const { order, from } = await transitionOrder(b.orderId, b.newStatus, {
    actor: { id: user.id, name: user.name },
    note: b.note,
    shipment,
  });

  await audit({
    userId: user.id,
    action: "STATUS_CHANGE",
    entityType: "Order",
    entityId: order.id,
    oldValues: { status: from },
    newValues: { status: b.newStatus, note: b.note, tracking: b.trackingNumber },
    req,
  });
  return ok({ success: true, message: `Order ${order.orderNumber} updated to ${b.newStatus}` });
});
