"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "@/lib/api";
import type { Cart, User } from "@/lib/types";

type Toast = { id: number; message: string; type: "success" | "error" | "info" };

type Store = {
  user: User | null;
  cart: Cart | null;
  theme: "dark" | "light";
  ready: boolean;
  refresh: () => Promise<void>;
  setTheme: (t: "dark" | "light") => void;
  toast: (message: string, type?: Toast["type"]) => void;
};

const Ctx = createContext<Store | null>(null);

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used within Providers");
  return ctx;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [cart, setCart] = useState<Cart | null>(null);
  const [theme, setThemeState] = useState<"dark" | "light">("dark");
  const [ready, setReady] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [me, cartRes] = await Promise.all([
        api<{ data: User | null }>("/auth/me"),
        api<{ data: Cart }>("/cart"),
      ]);
      setUser(me.data);
      setCart(cartRes.data);
    } catch {
      /* API may still be booting */
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    const stored = (typeof window !== "undefined" && localStorage.getItem("aarohi-theme")) as
      | "dark"
      | "light"
      | null;
    const initial = stored || "dark";
    setThemeState(initial);
    document.documentElement.setAttribute("data-theme", initial);
    refresh();
  }, [refresh]);

  const setTheme = useCallback((t: "dark" | "light") => {
    setThemeState(t);
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem("aarohi-theme", t);
  }, []);

  const value = useMemo(
    () => ({ user, cart, theme, ready, refresh, setTheme, toast }),
    [user, cart, theme, ready, refresh, setTheme, toast]
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[80] flex w-[min(92vw,360px)] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto rounded-xl border px-4 py-3 text-sm shadow-lg ${
              t.type === "error"
                ? "border-danger/40 bg-surface text-danger"
                : t.type === "success"
                  ? "border-success/40 bg-surface text-success"
                  : "border-line bg-surface text-ink"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
