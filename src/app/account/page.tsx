"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/components/Providers";
import { api, ApiError } from "@/lib/api";
import { INDIAN_STATES } from "@/lib/format";
import type { Address } from "@/lib/types";

export default function AccountPage() {
  const { user, ready, refresh, toast } = useStore();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [form, setForm] = useState<Address>({
    fullName: "",
    phone: "",
    line1: "",
    city: "",
    state: "Karnataka",
    pinCode: "",
    country: "India",
  });
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "" });

  useEffect(() => {
    if (ready && !user) router.push("/login");
    if (user) {
      setFullName(user.fullName || "");
      setMobile(user.mobile || "");
      api<{ data: Address[] }>("/account/addresses").then((r) => setAddresses(r.data)).catch(() => {});
    }
  }, [user, ready, router]);

  if (!user) return null;

  return (
    <div className="container-store max-w-3xl space-y-8 py-10">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Account</h1>
          <p className="text-sm text-muted">{user.email}</p>
        </div>
        <div className="flex gap-2">
          {user.role === "ADMIN" && <Link href="/admin" className="btn-secondary">Admin</Link>}
          <button
            className="btn-secondary"
            onClick={async () => {
              await api("/auth/logout", { method: "POST" });
              await refresh();
              router.push("/");
            }}
          >
            Log out
          </button>
        </div>
      </div>

      <section className="card p-6">
        <h2 className="font-medium">Profile</h2>
        <form
          className="mt-4 grid gap-4 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api("/account/profile", { method: "PATCH", body: JSON.stringify({ fullName, mobile }) });
              await refresh();
              toast("Profile saved", "success");
            } catch (err) {
              toast(err instanceof ApiError ? err.message : "Could not save", "error");
            }
          }}
        >
          <div>
            <label className="label">Full name</label>
            <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <label className="label">Mobile</label>
            <input className="input" value={mobile} onChange={(e) => setMobile(e.target.value)} />
          </div>
          <button className="btn-primary sm:col-span-2 w-fit">Save profile</button>
        </form>
      </section>

      <section className="card p-6">
        <h2 className="font-medium">Saved addresses</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {addresses.map((a) => (
            <li key={a.id} className="flex items-start justify-between gap-3 rounded-xl border border-line p-3">
              <p>
                {a.fullName}, {a.line1}, {a.city}, {a.state} {a.pinCode}
              </p>
              <button
                className="text-danger"
                onClick={async () => {
                  await api(`/account/addresses/${a.id}`, { method: "DELETE" });
                  setAddresses((xs) => xs.filter((x) => x.id !== a.id));
                }}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <form
          className="mt-6 grid gap-3 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              const res = await api<{ data: Address }>("/account/addresses", {
                method: "POST",
                body: JSON.stringify({ ...form, isDefault: addresses.length === 0 }),
              });
              setAddresses((xs) => [res.data, ...xs]);
              toast("Address saved", "success");
            } catch (err) {
              toast(err instanceof ApiError ? err.message : "Could not save address", "error");
            }
          }}
        >
          <input className="input" placeholder="Full name" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          <input className="input" placeholder="Phone" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input className="input sm:col-span-2" placeholder="Address" required value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} />
          <input className="input" placeholder="City" required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <select className="input" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })}>
            {INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <input className="input" placeholder="PIN" required value={form.pinCode} onChange={(e) => setForm({ ...form, pinCode: e.target.value })} />
          <button className="btn-secondary w-fit">Add address</button>
        </form>
      </section>

      <section className="card p-6">
        <h2 className="font-medium">Password</h2>
        <form
          className="mt-4 grid gap-3 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api("/auth/change-password", { method: "POST", body: JSON.stringify(pw) });
              setPw({ currentPassword: "", newPassword: "" });
              toast("Password updated", "success");
            } catch (err) {
              toast(err instanceof ApiError ? err.message : "Could not update password", "error");
            }
          }}
        >
          <input className="input" type="password" placeholder="Current password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
          <input className="input" type="password" placeholder="New password" minLength={8} value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} />
          <button className="btn-secondary w-fit">Update password</button>
        </form>
      </section>

      <Link href="/orders" className="btn-secondary inline-flex">Order history</Link>
    </div>
  );
}
