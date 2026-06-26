import { createAdminClient } from "@/lib/supabase/admin";
import { hasServiceRole } from "@/lib/supabase/env";
import { json, preflight, getMobileUser, getVendorIdForUser } from "@/lib/mobile/api";

export const dynamic = "force-dynamic";
export function OPTIONS() {
  return preflight();
}

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB product image cap

/**
 * POST (multipart, field "file") — upload a product image to the public `media`
 * bucket under the vendor's folder, and return its public URL.
 */
export async function POST(request: Request) {
  const user = await getMobileUser(request);
  if (!user) return json({ error: "Please sign in." }, 401);
  if (!hasServiceRole) return json({ error: "Unavailable" }, 503);
  const vendorId = await getVendorIdForUser(user.id);
  if (!vendorId) return json({ error: "You don’t have a store yet." }, 403);

  let file: File | null = null;
  try {
    const form = await request.formData();
    file = form.get("file") as File | null;
  } catch {
    return json({ error: "Invalid upload." }, 400);
  }
  if (!file || typeof file.arrayBuffer !== "function") return json({ error: "No file." }, 400);
  if (file.size > MAX_BYTES) return json({ error: "Image must be 5 MB or smaller." }, 400);
  // Accept by content-type OR extension — mobile multipart often sends
  // application/octet-stream, which is fine for an image the vendor picked.
  const looksImage =
    file.type?.startsWith("image/") ||
    !file.type ||
    file.type === "application/octet-stream" ||
    /\.(png|jpe?g|webp|gif|heic|heif)$/i.test(file.name || "");
  if (!looksImage) return json({ error: "Images only." }, 400);

  const safe = (file.name || "image").replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${vendorId}/${Date.now()}-${safe}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const admin = createAdminClient();
  const { error } = await admin.storage
    .from("media")
    .upload(path, bytes, { contentType: file.type || "image/jpeg", upsert: false });
  if (error) return json({ error: error.message }, 500);

  const url = admin.storage.from("media").getPublicUrl(path).data.publicUrl;
  return json({ url });
}
