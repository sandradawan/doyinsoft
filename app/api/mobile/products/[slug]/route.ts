import { getProductBySlug, getReviews } from "@/lib/data";
import { json, jsonCached, preflight } from "@/lib/mobile/api";

export function OPTIONS() {
  return preflight();
}

/** GET /api/mobile/products/[slug] — full product + reviews. */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return json({ error: "Not found" }, 404);

  const reviews = await getReviews(product.id);
  return jsonCached({
    product: {
      id: product.id,
      slug: product.slug,
      name: product.name,
      tagline: product.tagline,
      description: product.description,
      price_minor: product.price_minor,
      currency: product.currency,
      category: product.category,
      product_type: product.product_type,
      platform: product.platform,
      version: product.version,
      icon_url: product.icon_url,
      screenshots: product.screenshots,
      os_badges: product.os_badges,
      system_requirements: product.system_requirements,
      download_count: product.download_count,
      rating_avg: product.rating_avg,
      rating_count: product.rating_count,
      vendor: {
        slug: product.vendor.slug,
        name: product.vendor.name,
        verified: product.vendor.verified,
        whatsapp: product.vendor.whatsapp,
      },
    },
    reviews: reviews.map((r) => ({
      author_name: r.author_name,
      rating: r.rating,
      body: r.body,
      created_at: r.created_at,
    })),
    // The app completes payment in a WebView of the hardened web checkout.
    checkout_url: `/checkout/new?product=${encodeURIComponent(product.slug)}`,
  }, 30);
}
