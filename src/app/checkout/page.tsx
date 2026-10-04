"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/components/Providers";
import { api, ApiError } from "@/lib/api";
import { formatInr, INDIAN_STATES } from "@/lib/format";
import type { Address } from "@/lib/types";

const empty: Address = {
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "Karnataka",
  pinCode: "",
  country: "India",
};

export default function CheckoutPage() {
  const { user, cart, refresh, toast } = useStore();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [address, setAddress] = useState<Address>(empty);
  const [coupon, setCoupon] = useState("");
  const [saveAddress, setSaveAddress] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<Address[]>([]);

  useEffect(() => {
    if (user) {
      setName(user.fullName || "");
      setEmail(user.email);
      setMobile(user.mobile || "");
      api<{ data: Address[] }>("/account/addresses")
        .then((r) => {
          setSaved(r.data);
          const def = r.data.find((a) => a.isDefault) || r.data[0];
          if (def) {
            setAddress(def);
            setName(def.fullName || user.fullName || "");
            setMobile(def.phone || user.mobile || "");
          }
        })
        .catch(() => {});
    }
  }, [user]);

  async function place(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const created = await api<{ data: { id: string } }>("/checkout", {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          mobile,
          address,
          couponCode: coupon || undefined,
          saveAddress: Boolean(user) && saveAddress,
        }),
      });
      const pay = await api<{ data: { paymentUrl: string; orderId: string } }>("/payments/create", {
        method: "POST",
        body: JSON.stringify({ orderId: created.data.id }),
      });
      await refresh();
      router.push(pay.data.paymentUrl || `/checkout/pay/${created.data.id}`);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Checkout failed", "error");
    } finally {
      setBusy(false);
    }
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container-store py-20 text-center">
        <h1 className="text-2xl font-semibold">Nothing to check out</h1>
        <a href="/products" className="btn-primary mt-6 inline-flex">Shop</a>
      </div>
    );
  }

  return (
    <form onSubmit={place} className="container-store grid gap-10 py-10 lg:grid-cols-[1fr_360px]">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-semibold">Checkout</h1>
          <p className="mt-1 text-sm text-muted">Guest checkout is available. Create an account any time after.</p>
        </div>
        <section className="card p-6">
          <h2 className="font-medium">Customer</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="name">Full name</label>
              <input id="name" required className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="mobile">Mobile</label>
              <input id="mobile" required className="input" inputMode="numeric" placeholder="10-digit number" value={mobile} onChange={(e) => setMobile(e.target.value)} />
            </div>
          </div>
        </section>
        <section className="card p-6">
          <h2 className="font-medium">Shipping address</h2>
          {saved.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {saved.map((a) => (
                <button type="button" key={a.id} className="rounded-xl border border-line px-3 py-2 text-left text-xs hover:border-primary" onClick={() => setAddress(a)}>
                  {a.line1}, {a.city}
                </button>
              ))}
            </div>
          )}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Street address</label>
              <input required className="input" value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Apartment, landmark (optional)</label>
              <input className="input" value={address.line2 || ""} onChange={(e) => setAddress({ ...address, line2: e.target.value })} />
            </div>
            <div>
              <label className="label">City</label>
              <input required className="input" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
            </div>
            <div>
              <label className="label">State</label>
              <select className="input" value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })}>
                {INDIAN_STATES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">PIN code</label>
              <input required className="input" inputMode="numeric" value={address.pinCode} onChange={(e) => setAddress({ ...address, pinCode: e.target.value })} />
            </div>
            <div>
              <label className="label">Country</label>
              <input className="input" value="India" readOnly />
            </div>
          </div>
          {user && (
            <label className="mt-4 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} />
              Save this address to my account
            </label>
          )}
        </section>
      </div>
      <aside className="card h-fit p-6">
        <h2 className="font-semibold">Order summary</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {cart.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3">
              <span className="text-muted">{i.name} × {i.quantity}</span>
              <span>{formatInr(i.total)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex gap-2">
          <input className="input" placeholder="Coupon (AAROHI10)" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} />
        </div>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{formatInr(cart.subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd>{cart.shipping === 0 ? "Free" : formatInr(cart.shipping)}</dd></div>
          <div className="flex justify-between border-t border-line pt-3 font-semibold"><dt>To pay</dt><dd>{formatInr(cart.total)}</dd></div>
        </dl>
        <p className="mt-3 text-xs text-muted">You will be redirected to Cashfree (UPI, cards, net banking). The order is marked paid only after server-side verification.</p>
        <button className="btn-primary mt-5 w-full" disabled={busy}>
          {busy ? "Placing order…" : "Pay with Cashfree"}
        </button>
      </aside>
    </form>
  );
}
