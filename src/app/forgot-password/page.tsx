"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await api<{ data: { demoLink?: string } }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    setLink(res.data.demoLink || null);
    setDone(true);
  }

  return (
    <div className="container-store max-w-md py-16">
      <h1 className="text-3xl font-semibold">Reset password</h1>
      <form onSubmit={onSubmit} className="card mt-8 space-y-4 p-6">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <button className="btn-primary w-full">Send reset link</button>
      </form>
      {done && (
        <p className="mt-4 text-sm text-muted">
          If an account exists, a reset link has been generated.
          {link && (
            <>
              {" "}
              Demo link: <Link href={link} className="text-primary">{link}</Link>
            </>
          )}
        </p>
      )}
    </div>
  );
}
