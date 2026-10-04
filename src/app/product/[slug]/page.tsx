"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, Shield, Truck, RotateCcw } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Product } from "@/lib/types";
import { discountPct, formatInr } from "@/lib/format";
import ProductCard from "@/components/ProductCard";
import { useStore } from "@/components/Providers";

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { refresh, toast } = useStore();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [variantId, setVariantId] = useState<string>("");
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    api<{ data: Product; related: Product[] }>(`/products/${slug}`)
      .then((r) => {
        setProduct(r.data);
        setRelated(r.related || []);
        setVariantId(r.data.variants[0]?.id || "");
        document.title = `${r.data.seoTitle || r.data.name} · Aarohi`;
      })
      .catch(() => setProduct(null));
  }, [slug]);

  const variant = useMemo(
    () => product?.variants.find((v) => v.id === variantId) || product?.variants[0],
    [product, variantId]
  );
  const price = variant?.price ?? product?.price ?? 0;
  const images = product?.media.filter((m) => m.mediaType === "IMAGE") || [];
  const video = product?.media.find((m) => m.mediaType === "VIDEO");
  const frames = product?.media.filter((m) => m.mediaType === "360_FRAME") || [];

  async function add(goCheckout = false) {
    if (!variant) return;
    setBusy(true);
    try {
      await api("/cart/items", {
        method: "POST",
        body: JSON.stringify({ variantId: variant.id, quantity: qty }),
      });
      await refresh();
      toast("Added to bag", "success");
      if (goCheckout) router.push("/checkout");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Could not add to bag", "error");
    } finally {
      setBusy(false);
    }
  }

  if (!product) {
    return (
      <div className="container-store py-20 text-center text-muted">
        Loading product…
      </div>
    );
  }

  const pct = discountPct(price, product.compareAtPrice);
  const attrs = Array.from(
    new Set(product.variants.flatMap((v) => Object.keys(v.attributes || {})))
  ).filter(Boolean);

  return (
    <div className="container-store py-10">
      <nav className="mb-6 text-xs text-muted" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span className="mx-2">/</span>
        <Link href={`/category/${product.category.slug}`}>{product.category.name}</Link>
        <span className="mx-2">/</span>
        <span className="text-ink">{product.name}</span>
      </nav>
      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <div className="overflow-hidden rounded-3xl bg-surface">
            <img
              src={images[activeImage]?.url || product.image}
              alt={images[activeImage]?.altText || product.name}
              className="aspect-square w-full object-cover"
              onError={(e) => {
                e.currentTarget.src = "/media/placeholder.svg";
              }}
            />
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {images.map((m, i) => (
                <button
                  key={m.id}
                  className={`h-16 w-16 overflow-hidden rounded-xl border ${i === activeImage ? "border-primary" : "border-line"}`}
                  onClick={() => setActiveImage(i)}
                >
                  <img src={m.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
          {video && (
            <video className="mt-4 w-full rounded-2xl" controls preload="none" poster={product.image}>
              <source src={video.url} />
            </video>
          )}
          {frames.length > 0 && (
            <p className="mt-3 text-xs text-muted">360° frames available for this product.</p>
          )}
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-muted">{product.category.name}</p>
          <h1 className="mt-2 text-3xl font-semibold">{product.name}</h1>
          <p className="mt-1 text-xs text-muted">SKU {variant?.sku || product.sku}</p>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-2xl font-semibold">{formatInr(price)}</span>
            {product.compareAtPrice && product.compareAtPrice > price && (
              <>
                <span className="text-muted line-through">{formatInr(product.compareAtPrice)}</span>
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">{pct}% off</span>
              </>
            )}
          </div>
          <p className="mt-1 text-xs text-muted">Inclusive of all taxes</p>
          <p className="mt-5 text-sm leading-relaxed text-muted">{product.description}</p>

          {attrs.length > 0 && product.variants.length > 1 && (
            <div className="mt-6">
              <p className="label">Options</p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setVariantId(v.id)}
                    className={`rounded-xl border px-3 py-2 text-sm ${variantId === v.id ? "border-primary bg-primary/10" : "border-line"}`}
                  >
                    {v.variantName}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className={`mt-4 text-sm ${variant && variant.available > 0 ? "text-success" : "text-danger"}`}>
            {variant && variant.available > 0 ? `${variant.available} in stock` : "Out of stock"}
          </p>

          <div className="mt-6 flex items-center gap-3">
            <div className="flex items-center rounded-xl border border-line">
              <button className="px-3 py-2" aria-label="Decrease" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                <Minus size={14} />
              </button>
              <span className="w-8 text-center text-sm">{qty}</span>
              <button className="px-3 py-2" aria-label="Increase" onClick={() => setQty((q) => q + 1)}>
                <Plus size={14} />
              </button>
            </div>
            <button className="btn-secondary flex-1" disabled={busy || !variant?.available} onClick={() => add(false)}>
              Add to bag
            </button>
            <button className="btn-primary flex-1" disabled={busy || !variant?.available} onClick={() => add(true)}>
              Buy now
            </button>
          </div>

          <ul className="mt-8 space-y-3 text-sm text-muted">
            <li className="flex gap-2"><Truck size={16} className="mt-0.5 text-primary" /> Free delivery on orders over ₹1,999. Usually 3–6 days.</li>
            <li className="flex gap-2"><RotateCcw size={16} className="mt-0.5 text-primary" /> 7-day returns on unused items in original packaging.</li>
            <li className="flex gap-2"><Shield size={16} className="mt-0.5 text-primary" /> Secure payment via Cashfree. We never store card details.</li>
          </ul>

          {product.specifications && Object.keys(product.specifications).length > 0 && (
            <div className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-widest">Specifications</h2>
              <dl className="mt-3 divide-y divide-line rounded-2xl border border-line">
                {Object.entries(product.specifications).map(([k, v]) => (
                  <div key={k} className="grid grid-cols-2 px-4 py-2.5 text-sm">
                    <dt className="text-muted">{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-xl font-semibold">You may also like</h2>
          <div className="product-grid">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.name,
            description: product.seoDescription || product.description,
            sku: product.sku,
            image: product.image,
            offers: {
              "@type": "Offer",
              priceCurrency: "INR",
              price,
              availability: variant && variant.available > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            },
          }),
        }}
      />
    </div>
  );
}
