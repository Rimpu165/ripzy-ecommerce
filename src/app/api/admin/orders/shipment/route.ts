import { z } from "zod";
import { handler, ok, parseJson, ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { transitionOrder, upsertShipment } from "@/lib/orders";

const schema = z.object({
  orderId: z.string().min(1),
  courierName: z.string().trim().min(2, "Courier name is required.").max(100),
  trackingNumber: z.string().trim().min(3, "Tracking number is required.").max(100),
  trackingUrl: z.string().trim().url("Tracking URL must be a valid URL.").max(500).optional().or(z.literal("")),
  estimatedDelivery: z.string().optional(),
});

/** Assign courier + tracking. PROCESSING orders are moved to SHIPPED; SHIPPED orders get their shipment updated. */
export const POST = handler({ permission: "orders.update", limit: { max: 60, windowMs: 60_000 } }, async ({ user, req }) => {
  const b = await parseJson(req, schema);
  if (!user) throw new ApiError(401, "Authentication required");
  const eta = b.estimatedDelivery ? new Date(b.estimatedDelivery) : null;
  if (eta && isNaN(+eta)) throw new ApiError(400, "Invalid estimated delivery date.");
  const shipment = { courierName: b.courierName, trackingNumber: b.trackingNumber, trackingUrl: b.trackingUrl || null, estimatedDelivery: eta };
  const actor = { id: user.id, name: user.name };

  const order = await prisma.order.findUnique({ where: { id: b.orderId }, select: { status: true } });
  if (!order) throw new ApiError(404, "Order not found.");
  if (order.status === "PROCESSING") {
    await transitionOrder(b.orderId, "SHIPPED", { actor, shipment, note: `Shipped via ${b.courierName} (${b.trackingNumber})` });
  } else {
    await upsertShipment(b.orderId, shipment, actor);
  }
  await audit({
    userId: user.id,
    action: "STATUS_CHANGE",
    entityType: "Shipment",
    entityId: b.orderId,
    oldValues: { status: order.status },
    newValues: { ...b },
    req,
  });
  return ok({ success: true });
});
