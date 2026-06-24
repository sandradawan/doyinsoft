import { getWishlistProducts, toggleWishlist } from "@/lib/wishlist";
import { json, preflight, getMobileUser } from "@/lib/mobile/api";

export const dynamic = "force-dynamic";
export function OPTIONS() {
  return preflight();
}

/** GET /api/mobile/wishlist — the user's saved products. */
export async function GET(request: Request) {
  const user = await getMobileUser(request);
  if (!user) return json({ error: "Unauthorized" }, 401);
  const products = await getWishlistProducts(user.id);
  return json({
    products: products.map((p) => ({
      id: p.id,
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

/** POST /api/mobile/wishlist { product_id } — toggle saved; returns new state. */
export async function POST(request: Request) {
  const user = await getMobileUser(request);
  if (!user) return json({ error: "Unauthorized" }, 401);
  let body: { product_id?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: "Invalid body." }, 400);
  }
  const productId = String(body.product_id ?? "");
  if (!productId) return json({ error: "Missing product." }, 400);
  const saved = await toggleWishlist(user.id, productId);
  return json({ ok: true, saved });
}
