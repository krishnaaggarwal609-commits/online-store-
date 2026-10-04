"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useStore } from "@/components/Providers";

function ResetInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { toast } = useStore();
  const [password, setPassword] = useState("");
  const token = params.get("token") || "";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) });
      toast("Password updated. Please sign in.", "success");
      router.push("/login");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Reset failed", "error");
    }
  }

  return (
    <div className="container-store max-w-md py-16">
      <h1 className="text-3xl font-semibold">Choose a new password</h1>
      <form onSubmit={onSubmit} className="card mt-8 space-y-4 p-6">
        <div>
          <label className="label" htmlFor="password">New password</label>
          <input id="password" type="password" required minLength={8} className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button className="btn-primary w-full">Update password</button>
      </form>
    </div>
  );
}

export default function ResetPage() {
  return (
    <Suspense>
      <ResetInner />
    </Suspense>
  );
}
