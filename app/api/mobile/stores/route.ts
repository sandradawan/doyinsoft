import { getProducts } from "@/lib/data";
import { json, preflight } from "@/lib/mobile/api";
import type { Vendor } from "@/lib/types";

export const dynamic = "force-dynamic";
export function OPTIONS() {
  return preflight();
}

/** GET /api/mobile/stores — sellers with product/download counts (derived). */
export async function GET() {
  const products = await getProducts();
  const map = new Map<string, { vendor: Vendor; products: number; downloads: number }>();
  for (const p of products) {
    if (p.vendor.suspended) continue;
    const row = map.get(p.vendor.id) ?? { vendor: p.vendor, products: 0, downloads: 0 };
    row.products += 1;
    row.downloads += p.download_count;
    map.set(p.vendor.id, row);
  }
  const stores = [...map.values()]
    .sort((a, b) => b.downloads - a.downloads)
    .map((s) => ({
      slug: s.vendor.slug,
      name: s.vendor.name,
      initials: s.vendor.initials,
      verified: s.vendor.verified,
      products: s.products,
      downloads: s.downloads,
    }));
  return json({ stores });
}
