"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useStore } from "@/components/Providers";

type Row = { id: string; email: string; fullName?: string; mobile?: string; status: string; orderCount: number; createdAt: string };

export default function AdminCustomers() {
  const { toast } = useStore();
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const load = () => api<{ data: Row[] }>(`/admin/customers?q=${encodeURIComponent(q)}`).then((r) => setRows(r.data)).catch(() => {});
  useEffect(() => { load(); }, [q]);
  return (
    <div>
      <h1 className="text-2xl font-semibold">Customers</h1>
      <input className="input mt-4 max-w-sm" placeholder="Search email or name" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="card mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Orders</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-t border-line">
                <td className="px-4 py-3">{u.fullName || "—"}<p className="text-xs text-muted">{u.email} · {u.mobile}</p></td>
                <td className="px-4 py-3">{u.orderCount}</td>
                <td className="px-4 py-3">{u.status}</td>
                <td className="px-4 py-3">
                  <button
                    className="btn-secondary"
                    onClick={async () => {
                      await api(`/admin/customers/${u.id}`, {
                        method: "PATCH",
                        body: JSON.stringify({ status: u.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" }),
                      });
                      toast("Updated", "success");
                      load();
                    }}
                  >
                    {u.status === "ACTIVE" ? "Suspend" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
