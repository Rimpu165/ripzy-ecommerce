import React from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import AdminReviewsClient from "@/components/AdminReviewsClient";
import { ArrowLeft, MessageSquare } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  const user = await getCurrentUser();

  if (!user || !["STAFF", "MANAGER", "SUPER_ADMIN"].includes(user.role)) {
    redirect("/login?next=/admin/reviews");
  }

  const reviews = await prisma.review.findMany({
    include: {
      product: { select: { name: true, slug: true } },
      user: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20">
      <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="p-1 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="font-extrabold text-base">Review Moderation Queue</span>
        </div>
        <span className="text-xs text-slate-400">Total: {reviews.length} reviews</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            Customer Reviews & Ratings
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Moderate, approve, reject, or remove customer feedback before or after publication.
          </p>
        </div>

        <AdminReviewsClient initialReviews={reviews as any} userRole={user.role} />
      </div>
    </div>
  );
}
