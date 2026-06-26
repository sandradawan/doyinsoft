import { getProductsPage } from "@/lib/data";
import { jsonCached, preflight } from "@/lib/mobile/api";
import type { Platform, ProductType } from "@/lib/types";

export function OPTIONS() {
  return preflight();
}

/** GET /api/mobile/catalog?q=&category=&type=&platform=&page= — paginated approved products. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const type = (searchParams.get("type") as ProductType | null) ?? undefined;
  const platform = (searchParams.get("platform") as Platform | null) ?? undefined;
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const { items, hasMore } = await getProductsPage({
    platform,
    search: q,
    category,
    productType: type,
    page,
    pageSize: 20,
  });

  // Searches are personal/varied → cache briefly; plain catalog pages cache longer.
  const ttl = q ? 15 : 60;
  return jsonCached(
    {
      page,
      hasMore,
      products: items.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        tagline: p.tagline,
        price_minor: p.price_minor,
        currency: p.currency,
        category: p.category,
        product_type: p.product_type,
        icon_url: p.icon_url,
        rating_avg: p.rating_avg,
        rating_count: p.rating_count,
        vendor: { slug: p.vendor.slug, name: p.vendor.name, verified: p.vendor.verified },
      })),
    },
    ttl
  );
}
