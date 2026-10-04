"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatInr, statusLabel } from "@/lib/format";
import type { Order } from "@/lib/types";
import { useStore } from "@/components/Providers";

export default function OrdersPage() {
  const { user, ready } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!user) return;
    api<{ data: Order[] }>("/orders").then((r) => setOrders(r.data)).catch(() => {});
  }, [user]);

  if (ready && !user) {
    return (
      <div className="container-store py-20 text-center">
        <h1 className="text-2xl font-semibold">Sign in to see orders</h1>
        <Link href="/login" className="btn-primary mt-6 inline-flex">Sign in</Link>
      </div>
    );
  }

  return (
    <div className="container-store py-10">
      <h1 className="text-3xl font-semibold">Orders</h1>
      {orders.length === 0 ? (
        <p className="mt-6 text-muted">No orders yet.</p>
      ) : (
        <ul className="mt-6 divide-y divide-line rounded-2xl border border-line">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/orders/${o.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-surface">
                <div>
                  <p className="font-medium">{o.orderNumber}</p>
                  <p className="text-xs text-muted">{new Date(o.createdAt).toLocaleDateString("en-IN")} · {statusLabel(o.status)}</p>
                </div>
                <p className="font-medium">{formatInr(o.total)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
