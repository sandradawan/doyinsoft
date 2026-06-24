import { getProducts } from "@/lib/data";
import { json, preflight } from "@/lib/mobile/api";
import type { Platform, ProductType } from "@/lib/types";

export const dynamic = "force-dynamic";
export function OPTIONS() {
  return preflight();
}

/** GET /api/mobile/catalog?q=&category=&type=&platform= — approved products. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const type = (searchParams.get("type") as ProductType | null) ?? undefined;
  const platform = (searchParams.get("platform") as Platform | null) ?? undefined;

  const products = await getProducts(platform, q, category, type);
  return json({
    products: products.map((p) => ({
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
  });
}
