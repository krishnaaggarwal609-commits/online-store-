"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { formatInr, statusLabel } from "@/lib/format";

type Dash = {
  orders: number;
  customers: number;
  products: number;
  revenue: number;
  recentOrders: { id: string; orderNumber: string; customerName: string; total: number; status: string; paymentStatus: string; createdAt: string }[];
  lowStock: { id: string; product: string; variant: string; stock: number }[];
  revenueByDay: Record<string, number>;
};

export default function AdminHome() {
  const [data, setData] = useState<Dash | null>(null);
  useEffect(() => {
    api<{ data: Dash }>("/admin/dashboard").then((r) => setData(r.data)).catch(() => {});
  }, []);
  if (!data) return <p className="text-muted">Loading dashboard…</p>;
  const days = Object.entries(data.revenueByDay);
  const max = Math.max(1, ...days.map(([, v]) => v));

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Revenue (30d)", value: formatInr(data.revenue) },
          { label: "Orders", value: data.orders },
          { label: "Products", value: data.products },
          { label: "Customers", value: data.customers },
        ].map((c) => (
          <div key={c.label} className="card p-5">
            <p className="text-xs uppercase tracking-widest text-muted">{c.label}</p>
            <p className="mt-2 text-2xl font-semibold">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="card p-5">
        <p className="text-sm font-medium">Revenue · last 14 days</p>
        <div className="mt-4 flex h-32 items-end gap-1">
          {days.map(([d, v]) => (
            <div key={d} className="flex-1 rounded-t bg-primary/80" style={{ height: `${(v / max) * 100}%`, minHeight: 2 }} title={`${d}: ${formatInr(v)}`} />
          ))}
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3">
            <p className="font-medium">Recent orders</p>
            <Link href="/admin/orders" className="text-sm text-primary">View all</Link>
          </div>
          <ul className="divide-y divide-line text-sm">
            {data.recentOrders.map((o) => (
              <li key={o.id}>
                <Link href={`/admin/orders/${o.id}`} className="flex justify-between px-5 py-3 hover:bg-elevated">
                  <span>{o.orderNumber}<span className="ml-2 text-muted">{o.customerName}</span></span>
                  <span>{formatInr(o.total)} · {statusLabel(o.status)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="card overflow-hidden">
          <p className="px-5 py-3 font-medium">Low stock</p>
          <ul className="divide-y divide-line text-sm">
            {data.lowStock.map((s) => (
              <li key={s.id} className="flex justify-between px-5 py-3">
                <span>{s.product} <span className="text-muted">{s.variant}</span></span>
                <span className="text-warning">{s.stock} left</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
