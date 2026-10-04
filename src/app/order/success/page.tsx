"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { formatInr } from "@/lib/format";
import type { Order } from "@/lib/types";
import { CheckCircle2 } from "lucide-react";

function SuccessInner() {
  const params = useSearchParams();
  const orderId = params.get("orderId") || "";
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!orderId) return;
    api<{ data: Order }>(`/orders/${orderId}`)
      .then((r) => setOrder(r.data))
      .catch(() => {});
  }, [orderId]);

  return (
    <div className="container-store max-w-lg py-20 text-center">
      <CheckCircle2 className="mx-auto text-success" size={48} />
      <h1 className="mt-4 text-3xl font-semibold">Payment received</h1>
      <p className="mt-2 text-sm text-muted">
        Your order is confirmed only because the server verified the Cashfree payment. A copy sits in your account.
      </p>
      {order && (
        <div className="card mt-8 p-6 text-left text-sm">
          <div className="flex justify-between"><span className="text-muted">Order</span><span>{order.orderNumber}</span></div>
          <div className="mt-2 flex justify-between"><span className="text-muted">Status</span><span>{order.status}</span></div>
          <div className="mt-2 flex justify-between"><span className="text-muted">Paid</span><span>{formatInr(order.total)}</span></div>
        </div>
      )}
      <div className="mt-8 flex justify-center gap-3">
        {order && <Link href={`/orders/${order.id}`} className="btn-primary">View order</Link>}
        <Link href="/products" className="btn-secondary">Continue shopping</Link>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense>
      <SuccessInner />
    </Suspense>
  );
}
