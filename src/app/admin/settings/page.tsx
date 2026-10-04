"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useStore } from "@/components/Providers";

export default function AdminSettings() {
  const { toast } = useStore();
  const [form, setForm] = useState<Record<string, string>>({});
  useEffect(() => {
    api<{ data: Record<string, string> }>("/admin/settings").then((r) => setForm(r.data)).catch(() => {});
  }, []);
  return (
    <form
      className="card max-w-xl space-y-4 p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        await api("/admin/settings", { method: "PATCH", body: JSON.stringify(form) });
        toast("Settings saved", "success");
      }}
    >
      <h1 className="text-2xl font-semibold">Settings</h1>
      {["storeName", "supportEmail", "supportPhone", "freeShippingMin", "gstin"].map((key) => (
        <div key={key}>
          <label className="label">{key}</label>
          <input className="input" value={form[key] || ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
        </div>
      ))}
      <button className="btn-primary">Save</button>
    </form>
  );
}
