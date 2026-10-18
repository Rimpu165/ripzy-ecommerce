import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !["STAFF", "MANAGER", "SUPER_ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { orderId, newStatus, trackingNumber, courierName, note } = await req.json();

    if (!orderId || !newStatus) {
      return NextResponse.json({ error: "orderId and newStatus are required" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Strict status state machine check (FR-AORD-02)
    const validTransitions: Record<string, string[]> = {
      PENDING_PAYMENT: ["CONFIRMED", "CANCELLED"],
      CONFIRMED: ["PROCESSING", "CANCELLED"],
      PROCESSING: ["SHIPPED", "CANCELLED"],
      SHIPPED: ["DELIVERED"],
      DELIVERED: ["REFUNDED"],
      CANCELLED: [],
      REFUNDED: [],
    };

    const allowed = validTransitions[order.status] || [];
    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        { error: `Cannot transition order status from '${order.status}' to '${newStatus}'.` },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // 1. Update order status
      const updateData: any = { status: newStatus };
      if (newStatus === "SHIPPED") {
        updateData.shippedAt = new Date();
      } else if (newStatus === "DELIVERED") {
        updateData.deliveredAt = new Date();
        // Mark COD payments as SUCCESS upon delivery (FR-AORD-07)
        await tx.payment.updateMany({
          where: { orderId: order.id, paymentMethod: "COD" },
          data: { status: "SUCCESS" },
        });
      } else if (newStatus === "CANCELLED") {
        updateData.cancelledAt = new Date();
        // Release reserved stock (Rule 2 & Rule 6)
        for (const item of order.items) {
          if (item.variantId) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: {
                stock: { increment: item.quantity },
              },
            });
          }
        }
      }

      await tx.order.update({
        where: { id: order.id },
        data: updateData,
      });

      // 2. Shipment creation if tracking provided (FR-AORD-03)
      if (newStatus === "SHIPPED" && trackingNumber) {
        await tx.shipment.create({
          data: {
            orderId: order.id,
            courierName: courierName || "Bluedart / Delhivery",
            trackingNumber,
            shippedAt: new Date(),
          },
        });
      }

      // 3. Status History
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: newStatus,
          note: note || `Status updated to ${newStatus} by ${user.name} (${user.role})`,
          createdBy: user.name,
        },
      });

      // 4. Notification log (FR-NOTIF-01)
      await tx.notification.create({
        data: {
          userId: order.userId,
          recipientEmail: order.guestEmail || "customer@ripzy.com",
          subject: `Ripzy Order ${order.orderNumber} Status Updated: ${newStatus}`,
          type: newStatus === "SHIPPED" ? "SHIPPED" : newStatus === "DELIVERED" ? "DELIVERED" : "ORDER_CONFIRMED",
          content: `Your order status is now ${newStatus}.${trackingNumber ? ` Tracking Number: ${trackingNumber}` : ""}`,
          status: "SENT",
        },
      });
    });

    return NextResponse.json({ success: true, message: `Order updated to ${newStatus}` });
  } catch (error) {
    console.error("Admin order status error:", error);
    return NextResponse.json({ error: "Failed to update order status." }, { status: 500 });
  }
}
