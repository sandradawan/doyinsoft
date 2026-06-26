import { jsonCached, preflight } from "@/lib/mobile/api";
import { GIFT_DESIGNS } from "@/lib/gift-designs";
import { getCategories } from "@/lib/data";

export function OPTIONS() {
  return preflight();
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "";

/**
 * GET /api/mobile/config — bootstrap data for the app: the web base URL (the app
 * opens checkout / gift-card purchase / payment in a WebView of these hardened
 * flows), gift-card designs, and categories.
 */
export async function GET() {
  let categories: string[] = [];
  try {
    categories = await getCategories();
  } catch {
    categories = [];
  }
  return jsonCached({
    web_base_url: SITE_URL,
    checkout_path: "/checkout/new?product=", // append slug
    gift_cards_path: "/gift-cards",
    gift_designs: GIFT_DESIGNS.map((d) => ({
      key: d.key,
      label: d.label,
      from: d.from,
      to: d.to,
    })),
    categories,
  }, 300);
}
