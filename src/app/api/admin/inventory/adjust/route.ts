import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !["STAFF", "MANAGER", "SUPER_ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { variantId, changeQty, reason = "MANUAL_ADJUSTMENT" } = await req.json();

    if (!variantId || changeQty === undefined) {
      return NextResponse.json({ error: "variantId and changeQty are required" }, { status: 400 });
    }

    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
    });

    if (!variant) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }

    const newStock = Math.max(0, variant.stock + changeQty);

    // Concurrency-safe transaction writing to inventory ledger (FR-INV-02 & Rule 2)
    await prisma.$transaction(async (tx) => {
      await tx.productVariant.update({
        where: { id: variant.id },
        data: { stock: newStock },
      });

      await tx.inventoryLedger.create({
        data: {
          variantId: variant.id,
          changeQty,
          previousStock: variant.stock,
          newStock,
          reason,
          referenceId: `ADJUST-${Date.now()}`,
          createdBy: `${user.name} (${user.role})`,
        },
      });
    });

    return NextResponse.json({ success: true, newStock, message: "Stock successfully updated" });
  } catch (error) {
    console.error("Inventory adjustment error:", error);
    return NextResponse.json({ error: "Failed to adjust stock." }, { status: 500 });
  }
}
