import { getVendorBySlug, getProducts } from "@/lib/data";
import { json, preflight } from "@/lib/mobile/api";

export const dynamic = "force-dynamic";
export function OPTIONS() {
  return preflight();
}

/** GET /api/mobile/stores/[slug] — a store's profile + its products. */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const vendor = await getVendorBySlug(slug);
  if (!vendor) return json({ error: "Store not found" }, 404);

  const all = await getProducts();
  const products = all.filter((p) => p.vendor.slug === slug);

  return json({
    store: {
      slug: vendor.slug,
      name: vendor.name,
      initials: vendor.initials,
      verified: vendor.verified,
      bio: vendor.bio ?? null,
      cover_url: vendor.cover_url ?? null,
      whatsapp: vendor.whatsapp ?? null,
    },
    products: products.map((p) => ({
      slug: p.slug,
      name: p.name,
      tagline: p.tagline,
      price_minor: p.price_minor,
      currency: p.currency,
      product_type: p.product_type,
      icon_url: p.icon_url,
      rating_avg: p.rating_avg,
      rating_count: p.rating_count,
      vendor: { slug: p.vendor.slug, name: p.vendor.name, verified: p.vendor.verified },
    })),
  });
}
