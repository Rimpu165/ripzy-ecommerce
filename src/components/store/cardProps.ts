import type { ProductCardProps } from "@/components/ProductCard";

interface CardSource {
  id: string;
  name: string;
  slug: string;
  brand?: { name: string } | null;
  category?: { name: string } | null;
  variants: { id: string; price: number; compareAtPrice: number | null; stock: number; reservedStock: number }[];
  images: { url: string; isPrimary: boolean }[];
}

/** Maps a Prisma product (with brand/variants/images) to ProductCard props. */
export function toCardProps(p: CardSource, rating?: { avg: number; count: number }): ProductCardProps {
  const available = (v: { stock: number; reservedStock: number }) => v.stock - v.reservedStock;
  const v = p.variants.find((x) => available(x) > 0) ?? p.variants[0];
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    brandName: p.brand?.name,
    categoryName: p.category?.name,
    price: v?.price || 0,
    compareAtPrice: v?.compareAtPrice,
    imageUrl: p.images.find((i) => i.isPrimary)?.url || p.images[0]?.url,
    variantsCount: p.variants.length,
    defaultVariantId: v?.id || "",
    stock: v ? Math.max(0, available(v)) : 0,
    rating: rating?.avg,
    reviewCount: rating?.count ?? 0,
  };
}
