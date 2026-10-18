import React from "react";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PrintableInvoiceClient from "@/components/PrintableInvoiceClient";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function OrderInvoicePage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?next=/account/orders/${id}/invoice`);
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      payments: true,
      shipments: true,
      user: true,
    },
  });

  if (!order) {
    notFound();
  }

  // Security check: Only the owner or admin/staff can view this invoice
  const isStaffOrAdmin = ["STAFF", "MANAGER", "SUPER_ADMIN"].includes(user.role);
  if (order.userId && order.userId !== user.id && !isStaffOrAdmin) {
    redirect("/account/orders");
  }

  return <PrintableInvoiceClient order={order as any} />;
}
