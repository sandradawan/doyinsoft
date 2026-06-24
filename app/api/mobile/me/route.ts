import { getLicensesByEmail, getStoreByOwner } from "@/lib/data";
import { getGiftCardsForEmail } from "@/lib/giftcards";
import { getFollowedVendors } from "@/lib/follows";
import { json, preflight, getMobileUser } from "@/lib/mobile/api";

export const dynamic = "force-dynamic";
export function OPTIONS() {
  return preflight();
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "";

/** GET /api/mobile/me — the signed-in user's profile, licenses, and gift cards. */
export async function GET(request: Request) {
  const user = await getMobileUser(request);
  if (!user) return json({ error: "Unauthorized" }, 401);

  const [licenses, giftCards, following, store] = await Promise.all([
    getLicensesByEmail(user.email),
    getGiftCardsForEmail(user.email),
    getFollowedVendors(user.id),
    getStoreByOwner(user.id),
  ]);

  return json({
    user: { id: user.id, email: user.email },
    store: store ? { slug: store.slug, name: store.name } : null,
    following: following.map((v) => ({
      slug: v.slug,
      name: v.name,
      initials: v.initials,
      verified: v.verified,
    })),
    licenses: licenses.map((l) => ({
      key: l.key,
      status: l.status,
      product: { name: l.product.name, slug: l.product.slug, version: l.product.version },
      issued_at: l.issued_at,
      download_url: `${SITE_URL}/api/download?key=${encodeURIComponent(l.key)}&order=${encodeURIComponent(l.order_id)}`,
    })),
    gift_cards: giftCards.map((g) => ({
      code: g.code,
      balance_minor: g.balance_minor,
      initial_minor: g.initial_minor,
      currency: g.currency,
      status: g.status,
      design: g.design,
    })),
  });
}
