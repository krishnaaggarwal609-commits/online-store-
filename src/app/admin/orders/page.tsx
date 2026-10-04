"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatInr, ORDER_STATUSES, statusLabel } from "@/lib/format";

type Row = {
  id: string;
  orderNumber: string;
  customerName: string;
  email: string;
  total: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
};

export default function AdminOrders() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  useEffect(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (status) p.set("status", status);
    api<{ data: Row[] }>(`/admin/orders?${p}`).then((r) => setRows(r.data)).catch(() => {});
  }, [q, status]);
  return (
    <div>
      <h1 className="text-2xl font-semibold">Orders</h1>
      <div className="mt-4 flex flex-wrap gap-3">
        <input className="input max-w-xs" placeholder="Search order, email, phone" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div className="card mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id} className="border-t border-line">
                <td className="px-4 py-3">
                  <Link href={`/admin/orders/${o.id}`} className="font-medium hover:text-primary">{o.orderNumber}</Link>
                  <p className="text-xs text-muted">{new Date(o.createdAt).toLocaleString("en-IN")}</p>
                </td>
                <td className="px-4 py-3">{o.customerName}<p className="text-xs text-muted">{o.email}</p></td>
                <td className="px-4 py-3">{formatInr(o.total)}</td>
                <td className="px-4 py-3">{o.paymentStatus}</td>
                <td className="px-4 py-3">{statusLabel(o.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
