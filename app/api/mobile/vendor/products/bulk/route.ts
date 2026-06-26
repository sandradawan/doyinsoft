import { createAdminClient } from "@/lib/supabase/admin";
import { hasServiceRole } from "@/lib/supabase/env";
import { json, preflight, getMobileUser, getVendorIdForUser } from "@/lib/mobile/api";
import type { Currency, Platform } from "@/lib/types";

export const dynamic = "force-dynamic";
export function OPTIONS() {
  return preflight();
}

const TYPES = ["digital", "physical", "service"];
const MAX_ITEMS = 20;

function slugify(input: string): string {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

interface Item {
  name?: string;
  price?: number | string;
  currency?: string;
  product_type?: string;
  category?: string;
}

/**
 * POST { items: [...] } — quick-add several products at once. Each needs just a
 * name + price; details (image, description, download link) are added later by
 * editing. All start as 'pending' review. Returns how many were created and any
 * that were skipped.
 */
export async function POST(request: Request) {
  const user = await getMobileUser(request);
  if (!user) return json({ error: "Please sign in." }, 401);
  if (!hasServiceRole) return json({ error: "Unavailable" }, 503);
  const vendorId = await getVendorIdForUser(user.id);
  if (!vendorId) return json({ error: "You don’t have a store yet." }, 403);

  let body: { items?: Item[] };
  try {
    body = (await request.json()) as { items?: Item[] };
  } catch {
    return json({ error: "Invalid body." }, 400);
  }
  const items = (body.items ?? []).slice(0, MAX_ITEMS);
  if (items.length === 0) return json({ error: "Add at least one item." }, 400);

  const admin = createAdminClient();
  let created = 0;
  const skipped: { name: string; error: string }[] = [];

  for (const item of items) {
    const name = String(item.name ?? "").trim();
    if (!name) continue; // ignore blank rows
    const priceMajor = parseFloat(String(item.price ?? "0")) || 0;
    const row = {
      vendor_id: vendorId,
      name,
      price_minor: Math.max(0, Math.round(priceMajor * 100)),
      currency: (item.currency === "USD" ? "USD" : "NGN") as Currency,
      platform: "web" as Platform,
      category: String(item.category ?? "").trim(),
      product_type: TYPES.includes(String(item.product_type)) ? String(item.product_type) : "physical",
    };

    const base = slugify(name) || "product";
    let ok = false;
    for (let attempt = 0; attempt < 2 && !ok; attempt++) {
      const slug = attempt === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
      const { error } = await admin.from("products").insert({ slug, ...row });
      if (!error) {
        ok = true;
        created++;
      } else if (error.code !== "23505") {
        skipped.push({ name, error: error.message });
        break;
      }
    }
    if (!ok && !skipped.find((s) => s.name === name)) {
      skipped.push({ name, error: "Could not generate a unique link." });
    }
  }

  return json({ created, skipped });
}
