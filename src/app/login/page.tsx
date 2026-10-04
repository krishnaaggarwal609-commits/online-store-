"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useStore } from "@/components/Providers";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { refresh, toast } = useStore();
  const [email, setEmail] = useState(params.get("email") || "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api<{ data: { role: string } }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      await refresh();
      toast("Welcome back", "success");
      router.push(res.data.role === "ADMIN" ? "/admin" : "/account");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Could not sign in", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container-store max-w-md py-16">
      <h1 className="text-3xl font-semibold">Sign in</h1>
      <p className="mt-2 text-sm text-muted">
        New here? <Link href="/register" className="text-primary">Create an account</Link>
      </p>
      <form onSubmit={onSubmit} className="card mt-8 space-y-4 p-6">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" required className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button className="btn-primary w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        <Link href="/forgot-password" className="block text-center text-sm text-primary">Forgot password?</Link>
      </form>
      <div className="mt-6 rounded-xl border border-line p-4 text-xs text-muted">
        <p className="font-medium text-ink">Demo accounts</p>
        <p className="mt-1">Customer · priya@aarohi.in · Customer@123</p>
        <p>Admin · admin@aarohi.in · Admin@123456</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
