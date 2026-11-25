import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handler, parseJson, ok, fail } from "@/lib/api";
import { notify } from "@/lib/notify";
import { publish } from "@/lib/events";
import { getNumberSetting } from "@/lib/settings";

const schema = z.object({
  reason: z.string().trim().min(3, "Please select a reason.").max(120),
  details: z.string().trim().max(1000).optional(),
});

export const POST = handler<{ id: string }>(
  { auth: true, limit: { max: 10, windowMs: 60 * 60 * 1000, key: "order-return" } },
  async ({ user, req, params }) => {
    const { reason, details } = await parseJson(req, schema);

    const order = await prisma.order.findFirst({
      where: { id: params.id, userId: user!.id }, // ownership enforced server-side
      include: { returnRequests: true },
    });
    if (!order) return fail(404, "Order not found.");

    // Rule 7: only DELIVERED orders, inside the return window.
    if (order.status !== "DELIVERED" || !order.deliveredAt) {
      return fail(400, "Returns can only be requested for delivered orders.");
    }
    const windowDays = await getNumberSetting("order.returnWindowDays");
    const deadline = order.deliveredAt.getTime() + windowDays * 24 * 60 * 60 * 1000;
    if (Date.now() > deadline) {
      return fail(400, `The ${windowDays}-day return window for this order has closed.`);
    }
    if (order.returnRequests.some((r) => r.status !== "REJECTED")) {
      return fail(409, "A return request already exists for this order.");
    }

    const request = await prisma.returnRequest.create({
      data: { orderId: order.id, userId: user!.id, reason, details: details || null },
    });

    await notify({
      userId: user!.id,
      to: user!.email,
      type: "RETURN",
      subject: `Return request received for ${order.orderNumber}`,
      content: `We have received your return request for order ${order.orderNumber}. Our team will review it shortly.`,
    });
    publish({
      type: "return.requested",
      title: "Return requested",
      message: `${order.orderNumber}: ${reason}`,
      href: "/admin/returns",
    });

    return ok({ success: true, request }, { status: 201 });
  }
);
