"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useStore } from "@/components/Providers";

type ProductAdmin = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  status: string;
  featured: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  tags: string | null;
  categoryId: string;
  variants: { id: string; variantName: string; sku: string; stockQuantity: number; price: number | null; status: string }[];
  media: { id: string; url: string; mediaType: string; altText: string | null }[];
};

export default function EditProduct() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useStore();
  const [p, setP] = useState<ProductAdmin | null>(null);

  useEffect(() => {
    api<{ data: ProductAdmin }>(`/admin/products/${id}`)
      .then((r) => setP(r.data))
      .catch(() => {});
  }, [id]);

  if (!p) return <p className="text-muted">Loading…</p>;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await api<{ data: ProductAdmin }>(`/admin/products/${id}`, {
        method: "PATCH",
        body: JSON.stringify(p),
      });
      setP(res.data);
      toast("Saved", "success");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Save failed", "error");
    }
  }

  async function upload(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("mediaType", file.type.startsWith("video") ? "VIDEO" : "IMAGE");
    const res = await fetch(`/api/v1/admin/products/${id}/media`, { method: "POST", body: fd, credentials: "include" });
    const json = await res.json();
    if (!res.ok) return toast(json.error || "Upload failed", "error");
    setP((cur) => cur ? { ...cur, media: [...cur.media, json.data] } : cur);
    toast("Media uploaded", "success");
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <h1 className="text-2xl font-semibold">Edit product</h1>
      <div className="card grid gap-3 p-6 sm:grid-cols-2">
        <input className="input" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} />
        <input className="input" value={p.slug} onChange={(e) => setP({ ...p, slug: e.target.value })} />
        <input className="input" value={p.sku} onChange={(e) => setP({ ...p, sku: e.target.value })} />
        <input className="input" type="number" value={p.price} onChange={(e) => setP({ ...p, price: Number(e.target.value) })} />
        <input className="input" type="number" value={p.compareAtPrice || ""} onChange={(e) => setP({ ...p, compareAtPrice: e.target.value ? Number(e.target.value) : null })} placeholder="Compare at" />
        <select className="input" value={p.status} onChange={(e) => setP({ ...p, status: e.target.value })}>
          <option>ACTIVE</option>
          <option>DRAFT</option>
          <option>ARCHIVED</option>
        </select>
        <textarea className="input min-h-32 sm:col-span-2" value={p.description} onChange={(e) => setP({ ...p, description: e.target.value })} />
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={p.featured} onChange={(e) => setP({ ...p, featured: e.target.checked })} /> Featured
        </label>
      </div>
      <div className="card p-6">
        <p className="font-medium">Variants & stock</p>
        <div className="mt-3 space-y-2">
          {p.variants.map((v, i) => (
            <div key={v.id} className="grid gap-2 sm:grid-cols-4">
              <input className="input" value={v.variantName} onChange={(e) => {
                const variants = [...p.variants];
                variants[i] = { ...v, variantName: e.target.value };
                setP({ ...p, variants });
              }} />
              <input className="input" value={v.sku} onChange={(e) => {
                const variants = [...p.variants];
                variants[i] = { ...v, sku: e.target.value };
                setP({ ...p, variants });
              }} />
              <input className="input" type="number" value={v.stockQuantity} onChange={(e) => {
                const variants = [...p.variants];
                variants[i] = { ...v, stockQuantity: Number(e.target.value) };
                setP({ ...p, variants });
              }} />
              <input className="input" type="number" placeholder="Override price" value={v.price ?? ""} onChange={(e) => {
                const variants = [...p.variants];
                variants[i] = { ...v, price: e.target.value ? Number(e.target.value) : null };
                setP({ ...p, variants });
              }} />
            </div>
          ))}
        </div>
      </div>
      <div className="card p-6">
        <p className="font-medium">Media (R2 / local)</p>
        <div className="mt-3 flex flex-wrap gap-3">
          {p.media.map((m) => (
            <img key={m.id} src={m.url} alt={m.altText || ""} className="h-24 w-20 rounded-lg object-cover" />
          ))}
        </div>
        <input className="mt-4 text-sm" type="file" accept="image/*,video/mp4" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      </div>
      <button className="btn-primary">Save changes</button>
    </form>
  );
}
