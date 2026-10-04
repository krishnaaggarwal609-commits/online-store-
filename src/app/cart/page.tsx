"use client";

import Link from "next/link";
import { useStore } from "@/components/Providers";
import { api, ApiError } from "@/lib/api";
import { formatInr } from "@/lib/format";
import { Minus, Plus, Trash2 } from "lucide-react";

export default function CartPage() {
  const { cart, refresh, toast } = useStore();

  async function update(id: string, quantity: number) {
    try {
      await api(`/cart/items/${id}`, { method: "PATCH", body: JSON.stringify({ quantity }) });
      await refresh();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Could not update cart", "error");
    }
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container-store py-24 text-center">
        <h1 className="text-3xl font-semibold">Your bag is empty</h1>
        <p className="mt-3 text-muted">There is a tote, a watch, or a pair of pods waiting.</p>
        <Link href="/products" className="btn-primary mt-6 inline-flex">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="container-store grid gap-10 py-10 lg:grid-cols-[1fr_340px]">
      <div>
        <h1 className="text-3xl font-semibold">Bag</h1>
        <ul className="mt-6 divide-y divide-line">
          {cart.items.map((item) => (
            <li key={item.id} className="flex gap-4 py-5">
              <Link href={`/product/${item.slug}`} className="h-28 w-24 shrink-0 overflow-hidden rounded-xl bg-surface">
                <img src={item.image} alt={item.name} className="h-full w-full object-cover" onError={(e) => { e.currentTarget.src = "/media/placeholder.svg"; }} />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between gap-3">
                  <div>
                    <Link href={`/product/${item.slug}`} className="font-medium">
                      {item.name}
                    </Link>
                    <p className="text-xs text-muted">{item.variantName} · {item.sku}</p>
                  </div>
                  <p className="font-medium">{formatInr(item.total)}</p>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex items-center rounded-lg border border-line">
                    <button className="px-2 py-1" aria-label="Decrease" onClick={() => update(item.id, item.quantity - 1)}>
                      <Minus size={12} />
                    </button>
                    <span className="w-7 text-center text-sm">{item.quantity}</span>
                    <button className="px-2 py-1" aria-label="Increase" onClick={() => update(item.id, item.quantity + 1)}>
                      <Plus size={12} />
                    </button>
                  </div>
                  <button className="text-muted hover:text-danger" aria-label="Remove" onClick={() => update(item.id, 0)}>
                    <Trash2 size={16} />
                  </button>
                  <p className="text-xs text-muted">{formatInr(item.price)} each</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <aside className="card h-fit p-6">
        <h2 className="font-semibold">Summary</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{formatInr(cart.subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd>{cart.shipping === 0 ? "Free" : formatInr(cart.shipping)}</dd></div>
          <div className="flex justify-between border-t border-line pt-3 text-base font-semibold"><dt>Total</dt><dd>{formatInr(cart.total)}</dd></div>
        </dl>
        <p className="mt-3 text-xs text-muted">Final amount is recalculated on the server at checkout. Free shipping over ₹1,999.</p>
        <Link href="/checkout" className="btn-primary mt-5 w-full">
          Checkout
        </Link>
      </aside>
    </div>
  );
}
