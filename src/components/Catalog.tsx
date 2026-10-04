"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ProductCard from "./ProductCard";
import { api } from "@/lib/api";
import type { Category, Product } from "@/lib/types";
import { cn } from "@/lib/format";

type Props = {
  title: string;
  subtitle?: string;
  initialCategory?: string;
  initialQ?: string;
};

const SORTS = [
  { id: "newest", label: "Newest" },
  { id: "featured", label: "Featured" },
  { id: "price_asc", label: "Price: low to high" },
  { id: "price_desc", label: "Price: high to low" },
  { id: "name", label: "Name" },
];

export default function Catalog({ title, subtitle, initialCategory, initialQ }: Props) {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState(initialCategory || "");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [inStock, setInStock] = useState(false);
  const [loading, setLoading] = useState(true);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    p.set("page", String(page));
    p.set("pageSize", "12");
    p.set("sort", sort);
    if (category) p.set("category", category);
    if (initialQ) p.set("q", initialQ);
    if (minPrice) p.set("minPrice", minPrice);
    if (maxPrice) p.set("maxPrice", maxPrice);
    if (inStock) p.set("inStock", "true");
    return p.toString();
  }, [page, sort, category, initialQ, minPrice, maxPrice, inStock]);

  useEffect(() => {
    api<{ data: Category[] }>("/categories")
      .then((r) => setCategories(r.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    api<{ data: Product[]; meta: { page: number; totalPages: number; total: number } }>(`/products?${query}`)
      .then((r) => {
        setProducts(r.data);
        setMeta(r.meta);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [query]);

  return (
    <div className="container-store py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-sm text-muted">{subtitle}</p>}
        <p className="mt-2 text-xs text-muted">{meta.total} products</p>
      </div>
      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-6">
          <div>
            <p className="label">Category</p>
            <div className="flex flex-col gap-1">
              <button
                className={cn("rounded-lg px-3 py-1.5 text-left text-sm", !category && "bg-surface")}
                onClick={() => {
                  setCategory("");
                  setPage(1);
                  if (initialCategory) router.push("/products");
                }}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  className={cn("rounded-lg px-3 py-1.5 text-left text-sm", category === c.slug && "bg-surface")}
                  onClick={() => {
                    setCategory(c.slug);
                    setPage(1);
                  }}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="label">Price (₹)</p>
            <div className="flex gap-2">
              <input className="input" inputMode="numeric" placeholder="Min" value={minPrice} onChange={(e) => { setMinPrice(e.target.value); setPage(1); }} />
              <input className="input" inputMode="numeric" placeholder="Max" value={maxPrice} onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={inStock} onChange={(e) => { setInStock(e.target.checked); setPage(1); }} />
            In stock only
          </label>
        </aside>
        <div>
          <div className="mb-5 flex items-center justify-end">
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted">Sort</span>
              <select className="input w-auto py-2" value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}>
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {loading ? (
            <div className="product-grid">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[4/5] animate-pulse rounded-2xl bg-surface" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="text-lg font-medium">No products match.</p>
              <p className="mt-2 text-sm text-muted">Try a different filter or search term.</p>
            </div>
          ) : (
            <div className="product-grid">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
          {meta.totalPages > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              {Array.from({ length: meta.totalPages }).map((_, i) => (
                <button
                  key={i}
                  className={cn("h-9 w-9 rounded-lg text-sm", page === i + 1 ? "bg-primary text-white" : "bg-surface")}
                  onClick={() => setPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
