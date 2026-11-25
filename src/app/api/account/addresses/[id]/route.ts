import { prisma } from "@/lib/prisma";
import { handler, parseJson, ok, fail } from "@/lib/api";
import { addressSchema } from "@/lib/address-schema";

type P = { id: string };

export const PATCH = handler<P>({ auth: true }, async ({ user, req, params }) => {
  const data = await parseJson(req, addressSchema.partial());
  const existing = await prisma.address.findFirst({ where: { id: params.id, userId: user!.id } });
  if (!existing) return fail(404, "Address not found.");

  const address = await prisma.$transaction(async (tx) => {
    if (data.isDefault) await tx.address.updateMany({ where: { userId: user!.id }, data: { isDefault: false } });
    return tx.address.update({
      where: { id: existing.id },
      data: { ...data, ...(data.addressLine2 !== undefined && { addressLine2: data.addressLine2 || null }) },
    });
  });
  return ok({ success: true, address });
});

export const DELETE = handler<P>({ auth: true }, async ({ user, params }) => {
  const existing = await prisma.address.findFirst({ where: { id: params.id, userId: user!.id } });
  if (!existing) return fail(404, "Address not found.");
  await prisma.$transaction(async (tx) => {
    await tx.address.delete({ where: { id: existing.id } });
    if (existing.isDefault) {
      const next = await tx.address.findFirst({ where: { userId: user!.id }, orderBy: { createdAt: "desc" } });
      if (next) await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  });
  return ok({ success: true });
});
