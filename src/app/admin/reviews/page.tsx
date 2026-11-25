import React from "react";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AdminReviewsClient from "@/components/AdminReviewsClient";
import { PageHeader } from "@/components/admin/ui/PageHeader";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  const user = await getAdminUser("reviews.moderate");
  if (!user) redirect("/admin");

  const reviews = await prisma.review.findMany({
    include: {
      product: { select: { name: true, slug: true } },
      user: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  return (
    <div>
      <PageHeader title="Reviews" description={`Moderate customer feedback. ${reviews.length} review${reviews.length === 1 ? "" : "s"} in total.`} />
      <AdminReviewsClient
        initialReviews={reviews.map((r) => ({
          id: r.id,
          rating: r.rating,
          title: r.title,
          comment: r.comment,
          isVerifiedBuyer: r.isVerifiedBuyer,
          status: r.status,
          createdAt: r.createdAt.toISOString(),
          user: r.user,
          product: r.product,
        }))}
      />
    </div>
  );
}
