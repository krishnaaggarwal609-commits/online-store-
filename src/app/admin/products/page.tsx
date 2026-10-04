"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatInr } from "@/lib/format";

type Row = {
  id: string;
  name: string;
  sku: string;
  slug: string;
  price: number;
  status: string;
  category: { name: string };
  variants: { stockQuantity: number }[];
};

export default function AdminProducts() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => {
    api<{ data: Row[] }>(`/admin/products?q=${encodeURIComponent(q)}`).then((r) => setRows(r.data)).catch(() => {});
  }, [q]);
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Products</h1>
        <Link href="/admin/products/new" className="btn-primary">Add product</Link>
      </div>
      <input className="input mt-4 max-w-sm" placeholder="Search name or SKU" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="card mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-line">
                <td className="px-4 py-3">
                  <Link href={`/admin/products/${p.id}`} className="font-medium hover:text-primary">{p.name}</Link>
                  <p className="text-xs text-muted">{p.category.name}</p>
                </td>
                <td className="px-4 py-3 text-muted">{p.sku}</td>
                <td className="px-4 py-3">{formatInr(p.price)}</td>
                <td className="px-4 py-3">{p.variants.reduce((s, v) => s + v.stockQuantity, 0)}</td>
                <td className="px-4 py-3">{p.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
