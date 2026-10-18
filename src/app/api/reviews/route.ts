import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Please log in to submit a review." }, { status: 401 });
    }

    const { productId, rating, title, comment } = await req.json();

    if (!productId || !rating || !comment) {
      return NextResponse.json({ error: "Product, rating (1-5) and comment are required." }, { status: 400 });
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5 stars." }, { status: 400 });
    }

    // Rule 10 & FR-REV-03: One review per product per customer
    const existingReview = await prisma.review.findUnique({
      where: {
        productId_userId: {
          productId,
          userId: user.id,
        },
      },
    });

    if (existingReview) {
      return NextResponse.json(
        { error: "You have already reviewed this product. Only one review per product is allowed." },
        { status: 400 }
      );
    }

    // FR-REV-01: Verify purchaser check (delivered or confirmed order)
    const verifiedOrder = await prisma.order.findFirst({
      where: {
        userId: user.id,
        status: { in: ["DELIVERED", "CONFIRMED", "PROCESSING", "SHIPPED"] },
        items: {
          some: {
            variant: {
              productId,
            },
          },
        },
      },
    });

    const isVerifiedBuyer = Boolean(verifiedOrder);

    const review = await prisma.review.create({
      data: {
        productId,
        userId: user.id,
        orderId: verifiedOrder?.id || null,
        rating: Math.round(rating),
        title: title?.trim() || null,
        comment: comment.trim(),
        isVerifiedBuyer,
        status: "APPROVED", // Auto-approved or set to PENDING for moderation
      },
    });

    return NextResponse.json({
      success: true,
      message: "Thank you! Your review has been submitted successfully.",
      review,
    });
  } catch (error) {
    console.error("Review submission error:", error);
    return NextResponse.json({ error: "Failed to submit review." }, { status: 500 });
  }
}
