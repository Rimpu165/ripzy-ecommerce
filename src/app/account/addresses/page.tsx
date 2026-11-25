import React from "react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AddressManager from "@/components/account/AddressManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Addresses | Ripzy" };

export default async function AddressesPage() {
  const user = (await getCurrentUser())!;
  const addresses = await prisma.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Addresses</h1>
        <p className="mt-1 text-sm text-slate-500">Save up to 10 delivery addresses for faster checkout.</p>
      </div>
      <AddressManager
        initial={addresses.map((a) => ({
          id: a.id,
          fullName: a.fullName,
          phone: a.phone,
          addressLine1: a.addressLine1,
          addressLine2: a.addressLine2,
          city: a.city,
          state: a.state,
          postalCode: a.postalCode,
          isDefault: a.isDefault,
        }))}
      />
    </div>
  );
}
