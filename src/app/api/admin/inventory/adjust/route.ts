import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError, handler, ok, parseJson } from "@/lib/api";
import { audit } from "@/lib/audit";
import { handleStockChange } from "@/lib/stock-alerts";
import { invalidateCatalog } from "@/lib/catalog";

const schema = z.object({
  variantId: z.string().min(1),
  changeQty: z.number().int().min(-100000).max(100000).refine((n) => n !== 0, "changeQty cannot be 0"),
  reason: z.enum(["RESTOCK", "MANUAL_ADJUSTMENT"]).default("MANUAL_ADJUSTMENT"),
  note: z.string().max(200).optional(),
});

export const POST = handler({ permission: "inventory.adjust", limit: { max: 120, windowMs: 60_000 } }, async ({ user, req }) => {
  const body = await parseJson(req, schema);

  const result = await prisma.$transaction(async (tx) => {
    const variant = await tx.productVariant.findUnique({
      where: { id: body.variantId },
      include: { product: { select: { slug: true } } },
    });
    if (!variant) throw new ApiError(404, "Variant not found");

    const newStock = variant.stock + body.changeQty;
    if (newStock < 0) throw new ApiError(400, "Stock cannot go below 0.");
    if (newStock < variant.reservedStock) {
      throw new ApiError(409, `Cannot reduce stock below ${variant.reservedStock} reserved units.`);
    }

    // Guarded write: only applies if stock is still what we read (concurrency safety).
    const updated = await tx.productVariant.updateMany({
      where: { id: variant.id, stock: variant.stock },
      data: { stock: newStock },
    });
    if (updated.count === 0) throw new ApiError(409, "Stock changed concurrently. Please retry.");

    await tx.inventoryLedger.create({
      data: {
        variantId: variant.id,
        changeQty: body.changeQty,
        previousStock: variant.stock,
        newStock,
        reason: body.reason,
        referenceId: body.note?.trim() || `ADJUST-${Date.now()}`,
        createdBy: user ? `${user.name} (${user.role})` : "SYSTEM",
      },
    });
    return { variant, newStock };
  });

  const { variant, newStock } = result;
  if (body.changeQty > 0) await handleStockChange(variant.id, variant.stock - variant.reservedStock);

  await audit({
    userId: user?.id,
    action: "UPDATE",
    entityType: "InventoryAdjustment",
    entityId: variant.id,
    oldValues: { stock: variant.stock },
    newValues: { stock: newStock, reason: body.reason, sku: variant.sku },
    req,
  });
  invalidateCatalog(variant.product.slug);

  return ok({ success: true, newStock, message: "Stock successfully updated" });
});
