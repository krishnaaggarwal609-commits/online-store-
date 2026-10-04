"use client";

import Link from "next/link";
import type { Product } from "@/lib/types";
import { discountPct, formatInr } from "@/lib/format";

export default function ProductCard({ product }: { product: Product }) {
  const pct = discountPct(product.price, product.compareAtPrice);
  return (
    <article className="group">
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-surface">
          <img
            src={product.image || "/media/placeholder.svg"}
            alt={product.media[0]?.altText || product.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src = "/media/placeholder.svg";
            }}
          />
          {pct > 0 && (
            <span className="absolute left-3 top-3 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-white">
              {pct}% off
            </span>
          )}
          {!product.inStock && (
            <span className="absolute inset-x-3 bottom-3 rounded-full bg-bg/80 px-3 py-1 text-center text-[11px] uppercase tracking-wide">
              Out of stock
            </span>
          )}
        </div>
        <div className="mt-3 space-y-1">
          <p className="text-[11px] uppercase tracking-widest text-muted">{product.category.name}</p>
          <h3 className="text-sm font-medium leading-snug">{product.name}</h3>
          <p className="flex items-baseline gap-2 text-sm">
            <span className="font-semibold">{formatInr(product.price)}</span>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <span className="text-muted line-through">{formatInr(product.compareAtPrice)}</span>
            )}
          </p>
        </div>
      </Link>
    </article>
  );
}
