"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useStore } from "@/components/Providers";

type Cat = { id: string; name: string; slug: string; status: string; sortOrder: number; description?: string | null };

export default function AdminCategories() {
  const { toast } = useStore();
  const [rows, setRows] = useState<Cat[]>([]);
  const [form, setForm] = useState({ name: "", slug: "", description: "" });

  const load = () => api<{ data: Cat[] }>("/admin/categories").then((r) => setRows(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Categories</h1>
      <form
        className="card grid gap-3 p-5 sm:grid-cols-3"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await api("/admin/categories", { method: "POST", body: JSON.stringify(form) });
            setForm({ name: "", slug: "", description: "" });
            load();
            toast("Category created", "success");
          } catch (err) {
            toast(err instanceof ApiError ? err.message : "Failed", "error");
          }
        }}
      >
        <input className="input" placeholder="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-") })} />
        <input className="input" placeholder="Slug" required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
        <button className="btn-primary">Add</button>
      </form>
      <ul className="card divide-y divide-line">
        {rows.map((c) => (
          <li key={c.id} className="flex items-center justify-between px-5 py-3 text-sm">
            <div>
              <p className="font-medium">{c.name}</p>
              <p className="text-xs text-muted">/{c.slug}</p>
            </div>
            <button
              className="btn-secondary"
              onClick={async () => {
                await api(`/admin/categories/${c.id}`, {
                  method: "PATCH",
                  body: JSON.stringify({ status: c.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" }),
                });
                load();
              }}
            >
              {c.status === "ACTIVE" ? "Deactivate" : "Activate"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
