"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatInr, statusLabel } from "@/lib/format";
import type { Order } from "@/lib/types";
import { useStore } from "@/components/Providers";

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast, refresh } = useStore();
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    api<{ data: Order }>(`/orders/${id}`).then((r) => setOrder(r.data)).catch(() => setOrder(null));
  }, [id]);

  async function cancel() {
    try {
      const res = await api<{ data: Order }>(`/orders/${id}/cancel`, { method: "POST" });
      setOrder(res.data);
      await refresh();
      toast("Order cancelled", "success");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Could not cancel", "error");
    }
  }

  if (!order) return <div className="container-store py-20 text-muted">Loading order…</div>;
  const addr = order.shippingAddress || ({} as Order["shippingAddress"]);

  return (
    <div className="container-store max-w-3xl py-10">
      <p className="text-xs text-muted"><Link href="/orders">Orders</Link> / {order.orderNumber}</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">{order.orderNumber}</h1>
          <p className="text-sm text-muted">{new Date(order.createdAt).toLocaleString("en-IN")} · {statusLabel(order.status)} · Payment {statusLabel(order.paymentStatus)}</p>
        </div>
        {!["SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "RETURNED", "REFUNDED"].includes(order.status) && (
          <button className="btn-secondary" onClick={cancel}>Cancel order</button>
        )}
      </div>
      <ul className="card mt-8 divide-y divide-line">
        {order.items.map((i) => (
          <li key={i.id} className="flex gap-4 p-4">
            <img src={i.image} alt="" className="h-16 w-14 rounded-lg object-cover" />
            <div className="flex-1">
              <Link href={`/product/${i.slug}`} className="font-medium">{i.name}</Link>
              <p className="text-xs text-muted">{i.variantName} · Qty {i.quantity}</p>
            </div>
            <p>{formatInr(i.total)}</p>
          </li>
        ))}
      </ul>
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div className="card p-5 text-sm">
          <p className="font-medium">Shipping</p>
          <p className="mt-2 text-muted">
            {addr.fullName}<br />
            {addr.line1} {addr.line2}<br />
            {addr.city}, {addr.state} {addr.pinCode}<br />
            {addr.phone}
          </p>
          {order.trackingNumber && (
            <p className="mt-3">Tracking · {order.carrier} · {order.trackingNumber}</p>
          )}
        </div>
        <div className="card p-5 text-sm">
          <p className="font-medium">Amount</p>
          <dl className="mt-2 space-y-1">
            <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{formatInr(order.subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd>{formatInr(order.shippingFee)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Discount</dt><dd>-{formatInr(order.discount)}</dd></div>
            <div className="flex justify-between font-semibold"><dt>Total</dt><dd>{formatInr(order.total)}</dd></div>
          </dl>
        </div>
      </div>
      {order.history && order.history.length > 0 && (
        <ol className="mt-8 space-y-3 border-l border-line pl-4 text-sm">
          {order.history.map((h, i) => (
            <li key={i}>
              <p className="font-medium">{statusLabel(h.toStatus)}</p>
              <p className="text-xs text-muted">{new Date(h.createdAt).toLocaleString("en-IN")} {h.note ? `· ${h.note}` : ""}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
