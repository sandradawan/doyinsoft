import { createAdminClient } from "@/lib/supabase/admin";
import { hasServiceRole } from "@/lib/supabase/env";
import { json, preflight, getMobileUser, getVendorIdForUser } from "@/lib/mobile/api";
import type { Currency, Platform } from "@/lib/types";

export const dynamic = "force-dynamic";
export function OPTIONS() {
  return preflight();
}

const TYPES = ["digital", "physical", "service"];
const PLATFORMS = ["desktop", "mobile", "web", "free"];

function slugify(input: string): string {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

interface Body {
  name?: string;
  price?: number | string;
  currency?: string;
  platform?: string;
  category?: string;
  tagline?: string;
  description?: string;
  product_type?: string;
  icon_url?: string;
  download_url?: string;
  version?: string;
}

/** Map the client payload to product columns (shared by create + update). */
function fields(body: Body) {
  const priceMajor = parseFloat(String(body.price ?? "0")) || 0;
  const downloadUrl = String(body.download_url ?? "").trim();
  return {
    name: String(body.name ?? "").trim(),
    price_minor: Math.max(0, Math.round(priceMajor * 100)),
    currency: (body.currency === "USD" ? "USD" : "NGN") as Currency,
    platform: (PLATFORMS.includes(String(body.platform)) ? body.platform : "web") as Platform,
    category: String(body.category ?? "").trim(),
    tagline: String(body.tagline ?? "").trim(),
    description: String(body.description ?? "").trim(),
    product_type: TYPES.includes(String(body.product_type)) ? String(body.product_type) : "digital",
    icon_url: String(body.icon_url ?? "").trim() || null,
    file_path: downloadUrl || null,
    version: String(body.version ?? "").trim() || "1.0.0",
  };
}

/** GET — the signed-in vendor's own products (all statuses). */
export async function GET(request: Request) {
  const user = await getMobileUser(request);
  if (!user) return json({ error: "Please sign in." }, 401);
  const vendorId = await getVendorIdForUser(user.id);
  if (!vendorId) return json({ store: false, products: [] });

  const { data } = await createAdminClient()
    .from("products")
    .select(
      "id, slug, name, tagline, description, price_minor, currency, platform, category, product_type, status, icon_url, file_path, version"
    )
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });
  return json({ store: true, products: data ?? [] });
}

/** POST — create a product (defaults to 'pending' for admin review, like the web). */
export async function POST(request: Request) {
  const user = await getMobileUser(request);
  if (!user) return json({ error: "Please sign in." }, 401);
  if (!hasServiceRole) return json({ error: "Unavailable" }, 503);
  const vendorId = await getVendorIdForUser(user.id);
  if (!vendorId) return json({ error: "You don’t have a store yet." }, 403);

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return json({ error: "Invalid body." }, 400);
  }
  const f = fields(body);
  if (!f.name) return json({ error: "Product name is required." }, 400);
  if (f.product_type === "digital" && !f.file_path)
    return json({ error: "A download link is required for digital products." }, 400);

  const admin = createAdminClient();
  const base = slugify(f.name) || "product";
  // Try a clean slug; on a collision append a short suffix and retry once.
  for (let attempt = 0; attempt < 2; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const { data, error } = await admin
      .from("products")
      .insert({ slug, vendor_id: vendorId, ...f })
      .select("id, slug")
      .single();
    if (!error && data) return json({ ok: true, id: (data as { id: string }).id, slug });
    if (error?.code !== "23505") return json({ error: `Could not save: ${error?.message}` }, 500);
  }
  return json({ error: "Could not generate a unique link for this product." }, 500);
}

/** PATCH — update one of the vendor's products (keeps slug + status). */
export async function PATCH(request: Request) {
  const user = await getMobileUser(request);
  if (!user) return json({ error: "Please sign in." }, 401);
  if (!hasServiceRole) return json({ error: "Unavailable" }, 503);
  const vendorId = await getVendorIdForUser(user.id);
  if (!vendorId) return json({ error: "You don’t have a store yet." }, 403);

  let body: Body & { id?: string };
  try {
    body = (await request.json()) as Body & { id?: string };
  } catch {
    return json({ error: "Invalid body." }, 400);
  }
  const id = String(body.id ?? "");
  if (!id) return json({ error: "Missing product id." }, 400);
  const f = fields(body);
  if (!f.name) return json({ error: "Product name is required." }, 400);

  const { error, data } = await createAdminClient()
    .from("products")
    .update(f)
    .eq("id", id)
    .eq("vendor_id", vendorId) // ownership enforced
    .select("id")
    .maybeSingle();
  if (error) return json({ error: `Could not update: ${error.message}` }, 500);
  if (!data) return json({ error: "Product not found." }, 404);
  return json({ ok: true });
}

/** DELETE ?id= — remove one of the vendor's products. */
export async function DELETE(request: Request) {
  const user = await getMobileUser(request);
  if (!user) return json({ error: "Please sign in." }, 401);
  if (!hasServiceRole) return json({ error: "Unavailable" }, 503);
  const vendorId = await getVendorIdForUser(user.id);
  if (!vendorId) return json({ error: "You don’t have a store yet." }, 403);

  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) return json({ error: "Missing product id." }, 400);
  await createAdminClient().from("products").delete().eq("id", id).eq("vendor_id", vendorId);
  return json({ ok: true });
}
