// Runs before `vite dev` and `vite build` (predev/prebuild); writes public/sitemap.xml.
import { writeFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://jimbao.lovable.app";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const staticEntries: SitemapEntry[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/deals", changefreq: "daily", priority: "0.9" },
  { path: "/quick-sale", changefreq: "daily", priority: "0.8" },
  { path: "/estimate", changefreq: "monthly", priority: "0.7" },
  { path: "/custom-order", changefreq: "monthly", priority: "0.7" },
  { path: "/customs-tax", changefreq: "monthly", priority: "0.6" },
  { path: "/become-seller", changefreq: "monthly", priority: "0.7" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
];

async function fetchProducts(): Promise<SitemapEntry[]> {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.warn("sitemap: Supabase env missing, skipping product entries");
    return [];
  }
  try {
    const supabase = createClient(url, key);
    const { data, error } = await supabase
      .from("products")
      .select("id, updated_at")
      .order("updated_at", { ascending: false })
      .limit(1000);
    if (error || !data) {
      console.warn("sitemap: products query failed", error?.message);
      return [];
    }
    const entries: SitemapEntry[] = [];
    for (const row of data) {
      const lastmod = row.updated_at ? String(row.updated_at).slice(0, 10) : undefined;
      entries.push({ path: `/product/${row.id}`, lastmod, changefreq: "weekly", priority: "0.6" });
      entries.push({ path: `/product/${row.id}/forum`, lastmod, changefreq: "weekly", priority: "0.4" });
    }
    return entries;
  } catch (e) {
    console.warn("sitemap: error fetching products", e);
    return [];
  }
}

function build(entries: SitemapEntry[]): string {
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  );
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

(async () => {
  const products = await fetchProducts();
  const all = [...staticEntries, ...products];
  writeFileSync(resolve("public/sitemap.xml"), build(all));
  console.log(`sitemap.xml written (${all.length} entries)`);
})();
