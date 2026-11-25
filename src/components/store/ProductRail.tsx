import React from "react";
import ProductCard, { type ProductCardProps } from "@/components/ProductCard";
import SectionHeader from "./SectionHeader";

export default function ProductRail({
  title,
  eyebrow,
  href,
  products,
  id,
}: {
  title: string;
  eyebrow?: string;
  href?: string;
  products: ProductCardProps[];
  id: string;
}) {
  if (products.length === 0) return null;
  return (
    <section aria-labelledby={id} className="container-page">
      <SectionHeader id={id} title={title} eyebrow={eyebrow} href={href} />
      <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
        {products.slice(0, 4).map((p) => (
          <div key={p.id} className="w-[70%] shrink-0 snap-start sm:w-auto">
            <ProductCard {...p} />
          </div>
        ))}
      </div>
    </section>
  );
}
