"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { formatInr, ORDER_STATUSES, statusLabel } from "@/lib/format";
import { useStore } from "@/components/Providers";

export default function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useStore();
  const [order, setOrder] = useState<Record<string, unknown> | null>(null);
  const [status, setStatus] = useState("");
  const [tracking, setTracking] = useState("");
  const [carrier, setCarrier] = useState("Delhivery");

  useEffect(() => {
    api<{ data: Record<string, unknown> }>(`/admin/orders/${id}`)
      .then((r) => {
        setOrder(r.data);
        setStatus(String(r.data.status));
        const ship = (r.data.shipments as { trackingNumber?: string; carrier?: string }[] | undefined)?.[0];
        setTracking(ship?.trackingNumber || "");
        setCarrier(ship?.carrier || "Delhivery");
      })
      .catch(() => {});
  }, [id]);

  if (!order) return <p className="text-muted">Loading…</p>;
  const items = (order.items as { id: string; name: string; quantity: number; total: number }[]) || [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{String(order.orderNumber)}</h1>
      <p className="text-sm text-muted">{String(order.customerName)} · {String(order.email)} · {String(order.mobile)}</p>
      <p className="text-sm">Payment {String(order.paymentStatus)} · {formatInr(Number(order.total))}</p>
      <ul className="card divide-y divide-line text-sm">
        {items.map((i) => (
          <li key={i.id} className="flex justify-between px-4 py-3">
            <span>{i.name} × {i.quantity}</span>
            <span>{formatInr(i.total)}</span>
          </li>
        ))}
      </ul>
      <form
        className="card grid gap-3 p-5 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await api(`/admin/orders/${id}`, {
              method: "PATCH",
              body: JSON.stringify({ status, trackingNumber: tracking, carrier }),
            });
            toast("Order updated", "success");
          } catch (err) {
            toast(err instanceof ApiError ? err.message : "Update failed", "error");
          }
        }}
      >
        <div>
          <label className="label">Status</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            {ORDER_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Carrier</label>
          <input className="input" value={carrier} onChange={(e) => setCarrier(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Tracking number</label>
          <input className="input" value={tracking} onChange={(e) => setTracking(e.target.value)} />
        </div>
        <button className="btn-primary">Update order</button>
      </form>
      <p className="text-xs text-muted">Current: {statusLabel(String(order.status))}</p>
    </div>
  );
}
