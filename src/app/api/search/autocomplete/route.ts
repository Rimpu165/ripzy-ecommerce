import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim();

    if (!query || query.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    const products = await prisma.product.findMany({
      where: {
        status: "ACTIVE",
        deletedAt: null,
        OR: [
          { name: { contains: query } },
          { description: { contains: query } },
          { brand: { name: { contains: query } } },
        ],
      },
      include: {
        brand: true,
        variants: { take: 1, orderBy: { price: "asc" } },
        images: { take: 1, orderBy: { sortOrder: "asc" } },
      },
      take: 8, // FR-CAT-05: 8 suggestions
    });

    const suggestions = products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      brand: p.brand?.name || null,
      price: p.variants[0]?.price || 0,
      image: p.images[0]?.url || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100&q=80",
    }));

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Autocomplete error:", error);
    return NextResponse.json({ suggestions: [] });
  }
}
