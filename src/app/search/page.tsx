"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import Catalog from "@/components/Catalog";

function SearchInner() {
  const params = useSearchParams();
  const router = useRouter();
  const q = params.get("q") || "";
  const [value, setValue] = useState(q);
  return (
    <>
      <div className="container-store pt-8 md:hidden">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            router.push(`/search?q=${encodeURIComponent(value)}`);
          }}
        >
          <input className="input" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Search products, SKU, category…" aria-label="Search" />
        </form>
      </div>
      <Catalog
        title={q ? `Results for “${q}”` : "Search"}
        subtitle={q ? undefined : "Try a product name, SKU or category."}
        initialQ={q}
      />
    </>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchInner />
    </Suspense>
  );
}
