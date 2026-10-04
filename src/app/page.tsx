"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Shield, Truck, RotateCcw, CreditCard } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { api } from "@/lib/api";
import type { Category, Product } from "@/lib/types";

const TRUST = [
  { icon: Truck, title: "Free shipping", text: "On orders over ₹1,999, pan-India." },
  { icon: RotateCcw, title: "Easy returns", text: "7-day returns on unused items." },
  { icon: Shield, title: "Secure checkout", text: "Cashfree · UPI, cards, net banking." },
  { icon: CreditCard, title: "GST invoice", text: "Prices inclusive of all taxes." },
];

export default function HomePage() {
  const [featured, setFeatured] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newest, setNewest] = useState<Product[]>([]);

  useEffect(() => {
    api<{ data: Product[] }>("/products?featured=true&pageSize=8")
      .then((r) => setFeatured(r.data))
      .catch(() => {});
    api<{ data: Category[] }>("/categories")
      .then((r) => setCategories(r.data))
      .catch(() => {});
    api<{ data: Product[] }>("/products?sort=newest&pageSize=8")
      .then((r) => setNewest(r.data))
      .catch(() => {});
  }, []);

  return (
    <>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/media/banners/hero.jpg"
            alt=""
            className="h-full w-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0F172A] via-[#0F172A]/85 to-[#0F172A]/40" />
        </div>
        <div className="container-store relative grid min-h-[78vh] items-center py-20">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">New season</p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
              Elevate
              <br />
              everyday.
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted">
              A considered edit of bags, audio, timepieces and home — made for how India actually lives.
              Priced in rupees. Paid the way you already pay.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/products" className="btn-primary">
                Shop new arrivals <ArrowRight size={16} />
              </Link>
              <Link href="/category/bags-leather" className="btn-secondary">
                Explore bags
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="overflow-hidden border-y border-line bg-surface/60">
        <div className="marquee flex w-[200%] gap-10 py-3 text-xs uppercase tracking-[0.25em] text-muted">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex min-w-[100%] justify-around">
              <span>Free shipping over ₹1,999</span>
              <span>UPI · Cards · Net banking</span>
              <span>Hand-finished leather</span>
              <span>7-day returns</span>
              <span>Pan-India delivery</span>
              <span>GST invoices</span>
            </div>
          ))}
        </div>
      </div>

      <section className="container-store py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-muted">Browse</p>
            <h2 className="mt-1 text-2xl font-semibold">Categories</h2>
          </div>
          <Link href="/products" className="text-sm text-primary">
            View all
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/category/${c.slug}`}
              className="group relative aspect-[3/4] overflow-hidden rounded-2xl bg-surface"
            >
              <img
                src={c.imageUrl || "/media/placeholder.svg"}
                alt=""
                className="h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-105 group-hover:opacity-100"
                onError={(e) => {
                  e.currentTarget.src = "/media/placeholder.svg";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute inset-x-3 bottom-3">
                <p className="text-sm font-medium">{c.name}</p>
                <p className="text-xs text-white/70">{c.productCount} pieces</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-store pb-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-muted">Featured</p>
            <h2 className="mt-1 text-2xl font-semibold">The current edit</h2>
          </div>
        </div>
        <div className="product-grid">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <section className="container-store">
        <div className="grid overflow-hidden rounded-3xl bg-surface lg:grid-cols-2">
          <img
            src="/media/banners/promo.jpg"
            alt="Handcrafted collection"
            className="h-72 w-full object-cover lg:h-full"
            onError={(e) => {
              e.currentTarget.src = "/media/placeholder.svg";
            }}
          />
          <div className="flex flex-col justify-center p-8 sm:p-12">
            <p className="text-xs uppercase tracking-[0.25em] text-accent">Craft</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight">Made in small batches, not in a hurry.</h2>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Leather from Kanpur, merino from the hills, brass from a workshop that still files by hand.
              Aarohi exists so those objects can live next to the headphones you actually commute with.
            </p>
            <Link href="/category/home" className="btn-primary mt-6 w-fit">
              Shop home
            </Link>
          </div>
        </div>
      </section>

      <section className="container-store py-16">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.25em] text-muted">Just in</p>
          <h2 className="mt-1 text-2xl font-semibold">New objects</h2>
        </div>
        <div className="product-grid">
          {newest.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <section className="container-store pb-8">
        <div className="grid gap-4 rounded-3xl border border-line p-6 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST.map((t) => (
            <div key={t.title} className="flex gap-3">
              <t.icon className="mt-0.5 text-primary" size={20} />
              <div>
                <p className="text-sm font-medium">{t.title}</p>
                <p className="text-xs text-muted">{t.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
