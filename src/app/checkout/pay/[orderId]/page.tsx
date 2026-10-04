"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatInr } from "@/lib/format";
import type { Order } from "@/lib/types";
import { useStore } from "@/components/Providers";

export default function PayPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const router = useRouter();
  const { toast, refresh } = useStore();
  const [order, setOrder] = useState<Order | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ data: Order }>(`/orders/${orderId}`)
      .then((r) => setOrder(r.data))
      .catch(() => setOrder(null));
  }, [orderId]);

  async function complete(success: boolean) {
    setBusy(true);
    try {
      await api("/payments/demo/complete", {
        method: "POST",
        body: JSON.stringify({ orderId, success }),
      });
      await refresh();
      if (success) router.push(`/order/success?orderId=${orderId}`);
      else {
        toast("Payment failed. The order was not marked paid.", "error");
        router.push(`/orders/${orderId}`);
      }
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Payment error", "error");
    } finally {
      setBusy(false);
    }
  }

  if (!order) {
    return <div className="container-store py-20 text-center text-muted">Loading payment…</div>;
  }

  return (
    <div className="container-store max-w-lg py-16">
      <div className="card p-8">
        <p className="text-xs uppercase tracking-[0.25em] text-accent">Cashfree · Demo</p>
        <h1 className="mt-2 text-2xl font-semibold">Complete payment</h1>
        <p className="mt-2 text-sm text-muted">
          This is a sandbox stand-in for Cashfree Checkout. Connect <code>CASHFREE_APP_ID</code> and
          secret on Inforge to use live UPI, cards and net banking. The frontend cannot mark an order paid.
        </p>
        <dl className="mt-6 space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-muted">Order</dt><dd>{order.orderNumber}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Amount</dt><dd className="text-lg font-semibold">{formatInr(order.total)}</dd></div>
        </dl>
        <div className="mt-6 grid gap-2 text-sm">
          <div className="rounded-xl border border-line px-4 py-3">UPI — GPay, PhonePe, BHIM</div>
          <div className="rounded-xl border border-line px-4 py-3">Cards — Visa, Mastercard, RuPay</div>
          <div className="rounded-xl border border-line px-4 py-3">Net banking</div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button className="btn-primary" disabled={busy} onClick={() => complete(true)}>
            Simulate success
          </button>
          <button className="btn-secondary" disabled={busy} onClick={() => complete(false)}>
            Simulate failure
          </button>
        </div>
      </div>
    </div>
  );
}
