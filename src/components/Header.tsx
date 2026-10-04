"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Menu, Search, ShoppingBag, User, X, Sun, Moon } from "lucide-react";
import Logo from "./Logo";
import { useStore } from "./Providers";
import { api } from "@/lib/api";
import { formatInr } from "@/lib/format";

const NAV = [
  { href: "/products", label: "Shop" },
  { href: "/category/bags-leather", label: "Bags" },
  { href: "/category/audio", label: "Audio" },
  { href: "/category/timepieces", label: "Watches" },
  { href: "/category/home", label: "Home" },
  { href: "/category/apparel", label: "Apparel" },
];

type Suggest = {
  products: { id: string; name: string; slug: string; price: number; image?: string }[];
  categories: { name: string; slug: string }[];
};

export default function Header() {
  const { user, cart, theme, setTheme } = useStore();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [suggest, setSuggest] = useState<Suggest | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setSuggest(null);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await api<{ data: Suggest }>(`/search/suggest?q=${encodeURIComponent(q)}`);
        setSuggest(res.data);
      } catch {
        setSuggest(null);
      }
    }, 180);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (box.current && !box.current.contains(e.target as Node)) setSuggest(null);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const count = cart?.count || 0;

  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-bg/80 backdrop-blur-xl">
      <div className="container-store flex h-16 items-center gap-4">
        <button
          className="btn-ghost -ml-2 px-2 lg:hidden"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
        >
          <Menu size={20} />
        </button>
        <Logo />
        <nav className="ml-6 hidden items-center gap-5 text-sm text-muted lg:flex" aria-label="Primary">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="hover:text-ink">
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <div className="relative hidden md:block" ref={box}>
            <form action="/search" className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                name="q"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onFocus={() => setSearchOpen(true)}
                placeholder="Search products, SKU…"
                className="input h-10 w-64 pl-9 lg:w-80"
                aria-label="Search"
                autoComplete="off"
              />
            </form>
            {searchOpen && suggest && (suggest.products.length > 0 || suggest.categories.length > 0) && (
              <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-line bg-surface shadow-xl">
                {suggest.categories.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/category/${c.slug}`}
                    className="block px-4 py-2 text-xs uppercase tracking-wide text-muted hover:bg-elevated"
                    onClick={() => setSuggest(null)}
                  >
                    Category · {c.name}
                  </Link>
                ))}
                {suggest.products.map((p) => (
                  <Link
                    key={p.id}
                    href={`/product/${p.slug}`}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-elevated"
                    onClick={() => setSuggest(null)}
                  >
                    <span>{p.name}</span>
                    <span className="text-muted">{formatInr(p.price)}</span>
                  </Link>
                ))}
                <Link
                  href={`/search?q=${encodeURIComponent(q)}`}
                  className="block border-t border-line px-4 py-2.5 text-sm text-primary"
                  onClick={() => setSuggest(null)}
                >
                  View all results
                </Link>
              </div>
            )}
          </div>

          <Link href="/search" className="btn-ghost px-2 md:hidden" aria-label="Search">
            <Search size={20} />
          </Link>
          <button
            className="btn-ghost px-2"
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link
            href={user ? (user.role === "ADMIN" ? "/admin" : "/account") : "/login"}
            className="btn-ghost px-2"
            aria-label="Account"
          >
            <User size={20} />
          </Link>
          <Link href="/cart" className="btn-ghost relative px-2" aria-label={`Cart, ${count} items`}>
            <ShoppingBag size={20} />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-white">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-black/50" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 flex h-full w-[min(88vw,320px)] flex-col bg-bg p-5 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <Logo />
              <button className="btn-ghost px-2" aria-label="Close" onClick={() => setOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <nav className="flex flex-col gap-1 text-base">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="rounded-xl px-3 py-2.5 hover:bg-surface" onClick={() => setOpen(false)}>
                  {n.label}
                </Link>
              ))}
              <Link href="/category/wellness" className="rounded-xl px-3 py-2.5 hover:bg-surface" onClick={() => setOpen(false)}>
                Wellness
              </Link>
            </nav>
            <Link href="/account" className="mt-6 btn-secondary" onClick={() => setOpen(false)}>
              {user ? "My account" : "Sign in"}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
