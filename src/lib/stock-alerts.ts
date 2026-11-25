import { prisma } from "./prisma";
import { notify } from "./notify";
import { publish } from "./events";

/**
 * Call after ANY stock increase (admin adjust, product edit, order cancel/return restock).
 * `previousAvailable` = stock - reservedStock before the change. When a variant goes from
 * unavailable (<=0) to available, every pending StockAlert subscriber is notified once.
 */
export async function handleStockChange(variantId: string, previousAvailable: number) {
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { product: { select: { name: true, slug: true } } },
  });
  if (!variant) return;

  const available = variant.stock - variant.reservedStock;

  if (available > 0 && previousAvailable <= 0) {
    const alerts = await prisma.stockAlert.findMany({ where: { variantId, notifiedAt: null } });
    for (const a of alerts) {
      await notify({
        userId: a.userId,
        to: a.email,
        type: "BACK_IN_STOCK",
        subject: `${variant.product.name} is back in stock`,
        content: `Good news! ${variant.product.name} (${variant.title}) is available again: /products/${variant.product.slug}`,
      });
      await prisma.stockAlert.update({ where: { id: a.id }, data: { notifiedAt: new Date() } });
    }
  }

  if (available <= variant.lowStockThreshold) {
    publish({
      type: "stock.low",
      title: "Low stock",
      message: `${variant.product.name} — ${variant.title}: ${Math.max(available, 0)} left`,
      href: "/admin/products",
    });
  }
}
