"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useStore } from "@/components/Providers";
import type { Category } from "@/lib/types";

export default function NewProduct() {
  const router = useRouter();
  const { toast } = useStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    sku: "",
    categoryId: "",
    price: "",
    compareAtPrice: "",
    stock: "10",
    description: "",
    featured: false,
  });

  useEffect(() => {
    api<{ data: Category[] }>("/admin/categories").then((r) => {
      setCategories(r.data);
      if (r.data[0]) setForm((f) => ({ ...f, categoryId: r.data[0].id }));
    }).catch(() => {});
  }, []);

  return (
    <form
      className="card max-w-2xl space-y-4 p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          const res = await api<{ data: { id: string } }>("/admin/products", {
            method: "POST",
            body: JSON.stringify({
              ...form,
              price: Number(form.price),
              compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : null,
              stock: Number(form.stock),
              seoTitle: form.name,
            }),
          });
          toast("Product created", "success");
          router.push(`/admin/products/${res.data.id}`);
        } catch (err) {
          toast(err instanceof ApiError ? err.message : "Could not create", "error");
        }
      }}
    >
      <h1 className="text-2xl font-semibold">New product</h1>
      <input className="input" placeholder="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-") })} />
      <div className="grid gap-3 sm:grid-cols-2">
        <input className="input" placeholder="Slug" required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
        <input className="input" placeholder="SKU" required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
        <select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input className="input" placeholder="Price (INR)" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        <input className="input" placeholder="Compare-at price" value={form.compareAtPrice} onChange={(e) => setForm({ ...form, compareAtPrice: e.target.value })} />
        <input className="input" placeholder="Stock" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
      </div>
      <textarea className="input min-h-32" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
        Featured
      </label>
      <button className="btn-primary">Create</button>
    </form>
  );
}
