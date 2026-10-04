"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useStore } from "@/components/Providers";

export default function RegisterPage() {
  const router = useRouter();
  const { refresh, toast } = useStore();
  const [form, setForm] = useState({ fullName: "", email: "", mobile: "", password: "" });
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/auth/register", { method: "POST", body: JSON.stringify(form) });
      await refresh();
      toast("Account created", "success");
      router.push("/account");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Could not register", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container-store max-w-md py-16">
      <h1 className="text-3xl font-semibold">Create account</h1>
      <p className="mt-2 text-sm text-muted">
        Already registered? <Link href="/login" className="text-primary">Sign in</Link>
      </p>
      <form onSubmit={onSubmit} className="card mt-8 space-y-4 p-6">
        <div>
          <label className="label" htmlFor="fullName">Full name</label>
          <input id="fullName" required className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" required className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="mobile">Mobile</label>
          <input id="mobile" required className="input" inputMode="numeric" placeholder="10-digit Indian number" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" required minLength={8} className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <button className="btn-primary w-full" disabled={busy}>{busy ? "Creating…" : "Create account"}</button>
      </form>
    </div>
  );
}
