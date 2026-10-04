"use client";

import { useParams } from "next/navigation";
import Catalog from "@/components/Catalog";

const COPY: Record<string, { title: string; subtitle: string }> = {
  "bags-leather": { title: "Bags & Leather", subtitle: "Totes, backpacks and weekenders." },
  audio: { title: "Audio", subtitle: "Headphones, earphones and speakers." },
  timepieces: { title: "Timepieces", subtitle: "Automatic and quartz watches." },
  home: { title: "Home", subtitle: "Textiles, ceramics and lighting." },
  apparel: { title: "Apparel", subtitle: "Merino, linen and organic cotton." },
  wellness: { title: "Wellness", subtitle: "Daily rituals — copper, cork, candlelight." },
};

export default function CategoryPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const copy = COPY[slug] || { title: slug, subtitle: "" };
  return <Catalog title={copy.title} subtitle={copy.subtitle} initialCategory={slug} />;
}
