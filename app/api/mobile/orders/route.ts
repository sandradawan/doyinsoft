import { getOrdersByEmail } from "@/lib/data";
import { json, preflight, getMobileUser } from "@/lib/mobile/api";

export const dynamic = "force-dynamic";
export function OPTIONS() {
  return preflight();
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "";

/** GET /api/mobile/orders — the signed-in buyer's order history. */
export async function GET(request: Request) {
  const user = await getMobileUser(request);
  if (!user) return json({ error: "Unauthorized" }, 401);

  const orders = await getOrdersByEmail(user.email);
  return json({
    orders: orders.map((o) => ({
      id: o.id,
      product_name: o.product_name,
      product_slug: o.product_slug,
      amount_minor: o.amount_minor,
      currency: o.currency,
      status: o.status,
      fulfilment_status: o.fulfilment_status,
      created_at: o.created_at,
      download_url: o.license_key
        ? `${SITE_URL}/api/download?key=${encodeURIComponent(o.license_key)}&order=${encodeURIComponent(o.id)}`
        : null,
    })),
  });
}
