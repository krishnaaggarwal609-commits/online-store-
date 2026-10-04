import Link from "next/link";
import Logo from "./Logo";

const COLS = [
  {
    title: "Shop",
    links: [
      { href: "/products", label: "All products" },
      { href: "/category/bags-leather", label: "Bags & Leather" },
      { href: "/category/audio", label: "Audio" },
      { href: "/category/timepieces", label: "Timepieces" },
      { href: "/category/home", label: "Home" },
      { href: "/category/apparel", label: "Apparel" },
      { href: "/category/wellness", label: "Wellness" },
    ],
  },
  {
    title: "Help",
    links: [
      { href: "/shipping", label: "Shipping" },
      { href: "/returns", label: "Returns" },
      { href: "/orders", label: "Track order" },
      { href: "/account", label: "Account" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/login", label: "Sign in" },
      { href: "/register", label: "Create account" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-surface/50">
      <div className="container-store grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
            Modern essentials for India. Designed slowly, made to last, delivered nationwide.
            Prices inclusive of all taxes.
          </p>
          <p className="mt-4 text-xs text-muted">GSTIN 29AAROHI1234Z5 · Payments by Cashfree</p>
        </div>
        {COLS.map((col) => (
          <div key={col.title}>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">{col.title}</p>
            <ul className="mt-4 space-y-2 text-sm">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="hover:text-primary">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="container-store flex flex-col gap-2 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Aarohi. All rights reserved.</p>
          <p>UPI · Cards · Net banking · Free shipping over ₹1,999</p>
        </div>
      </div>
    </footer>
  );
}
