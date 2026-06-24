import { createAdminClient } from "@/lib/supabase/admin";
import { hasServiceRole } from "@/lib/supabase/env";
import { hasPurchased } from "@/lib/data";
import { json, preflight, getMobileUser } from "@/lib/mobile/api";
import { checkRateLimit, clientId } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";
export function OPTIONS() {
  return preflight();
}

/**
 * POST /api/mobile/reviews { product_id, rating, body, author_name? }
 * Verified-purchase only, one per buyer (upsert) — mirrors the web review action.
 */
export async function POST(request: Request) {
  const user = await getMobileUser(request);
  if (!user) return json({ error: "Please sign in." }, 401);
  if (!(await checkRateLimit(`mob-review:${await clientId()}`, 5, 60_000))) {
    return json({ error: "You're posting too fast — try again shortly." }, 429);
  }

  let payload: { product_id?: string; rating?: number; body?: string; author_name?: string };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return json({ error: "Invalid body." }, 400);
  }

  const productId = String(payload.product_id ?? "");
  const rating = Number(payload.rating ?? 0);
  const text = String(payload.body ?? "").trim().slice(0, 2000);
  const authorName =
    String(payload.author_name ?? "").trim() || user.email.split("@")[0] || "Verified buyer";

  if (!productId) return json({ error: "Missing product." }, 400);
  if (!(rating >= 1 && rating <= 5)) return json({ error: "Please choose a rating from 1 to 5." }, 400);
  if (!hasServiceRole) return json({ error: "Reviews are unavailable right now." }, 503);

  if (!(await hasPurchased(productId, user.email))) {
    return json({ error: "Only buyers who purchased this product can review it." }, 403);
  }

  const { error } = await createAdminClient()
    .from("reviews")
    .upsert(
      { product_id: productId, user_id: user.id, author_name: authorName, rating, body: text },
      { onConflict: "product_id,user_id" }
    );
  if (error) return json({ error: error.message }, 400);
  return json({ ok: true });
}
