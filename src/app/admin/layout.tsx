"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useStore } from "@/components/Providers";
import { LayoutDashboard, Package, FolderTree, ShoppingCart, Users, Settings } from "lucide-react";
import { cn } from "@/lib/format";

const LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, ready } = useStore();
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
    else if (user.role !== "ADMIN") router.replace("/");
  }, [user, ready, router]);

  if (!user || user.role !== "ADMIN") {
    return <div className="container-store py-20 text-center text-muted">Checking admin access…</div>;
  }

  return (
    <div className="container-store grid gap-8 py-8 lg:grid-cols-[220px_1fr]">
      <aside className="h-fit rounded-2xl border border-line bg-surface p-3">
        <p className="px-3 py-2 text-xs uppercase tracking-widest text-muted">Admin</p>
        <nav className="flex flex-col">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2 text-sm",
                path === l.href ? "bg-primary/15 text-primary" : "hover:bg-elevated"
              )}
            >
              <l.icon size={16} />
              {l.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div>{children}</div>
    </div>
  );
}
