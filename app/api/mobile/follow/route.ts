import { getVendorBySlug } from "@/lib/data";
import { toggleFollow } from "@/lib/follows";
import { json, preflight, getMobileUser } from "@/lib/mobile/api";

export const dynamic = "force-dynamic";
export function OPTIONS() {
  return preflight();
}

/** POST /api/mobile/follow { vendor_slug } — toggle follow; returns new state. */
export async function POST(request: Request) {
  const user = await getMobileUser(request);
  if (!user) return json({ error: "Please sign in." }, 401);

  let payload: { vendor_slug?: string };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return json({ error: "Invalid body." }, 400);
  }

  const slug = String(payload.vendor_slug ?? "");
  const vendor = slug ? await getVendorBySlug(slug) : null;
  if (!vendor) return json({ error: "Store not found." }, 404);

  const following = await toggleFollow(vendor.id, user.id, user.email);
  return json({ ok: true, following });
}
