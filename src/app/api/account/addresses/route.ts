import { prisma } from "@/lib/prisma";
import { handler, parseJson, ok, fail } from "@/lib/api";
import { addressSchema, MAX_ADDRESSES } from "@/lib/address-schema";

/** Saved addresses of the signed-in customer (default first). Usable by the checkout address step. */
export const GET = handler({ auth: true }, async ({ user }) => {
  const addresses = await prisma.address.findMany({
    where: { userId: user!.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
  return ok({ addresses });
});

export const POST = handler({ auth: true }, async ({ user, req }) => {
  const data = await parseJson(req, addressSchema);
  const count = await prisma.address.count({ where: { userId: user!.id } });
  if (count >= MAX_ADDRESSES) return fail(400, `You can save at most ${MAX_ADDRESSES} addresses.`);

  const makeDefault = data.isDefault || count === 0;
  const address = await prisma.$transaction(async (tx) => {
    if (makeDefault) await tx.address.updateMany({ where: { userId: user!.id }, data: { isDefault: false } });
    return tx.address.create({
      data: { ...data, addressLine2: data.addressLine2 || null, isDefault: makeDefault, userId: user!.id },
    });
  });
  return ok({ success: true, address }, { status: 201 });
});
