"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hasServiceRole, isSupabaseConfigured } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { SOFTWARE_BUCKET } from "@/lib/storage";
import { getCurrentVendor } from "@/lib/auth";
import type { Currency, Platform } from "@/lib/types";

export interface CreateProductState {
  error?: string;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Create a product and upload its binary to the private Storage bucket.
 * Uses the service-role client (trusted server action) so it works before
 * vendor auth is wired; swap to the session client once auth is in place.
 */
export async function createProduct(
  _prev: CreateProductState,
  formData: FormData
): Promise<CreateProductState> {
  if (!isSupabaseConfigured || !hasServiceRole) {
    return {
      error:
        "Uploading software needs a connected Supabase project with a service-role key. Add NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY to .env.local. Browsing and checkout work on seed data without it.",
    };
  }

  // Attribute the product to the signed-in vendor.
  const vendor = await getCurrentVendor();
  if (!vendor) return { error: "Please sign in as a vendor first." };
  const vendorId = vendor.id;

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Product name is required." };

  const slug = slugify(String(formData.get("slug") || name));
  const priceMajor = parseFloat(String(formData.get("price") ?? "0")) || 0;
  const currency = (String(formData.get("currency") ?? "NGN") as Currency) || "NGN";
  const platform = (String(formData.get("platform") ?? "web") as Platform) || "web";
  const osBadges = String(formData.get("os_badges") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const file = formData.get("file");
  const admin = createAdminClient();

  // 1) Upload the binary, if provided, into software/{vendorId}/{slug}/...
  let filePath: string | null = null;
  let fileName: string | null = null;
  let fileSize: number | null = null;

  if (file instanceof File && file.size > 0) {
    fileName = file.name;
    fileSize = file.size;
    filePath = `${vendorId}/${slug}/${file.name}`;
    const { error: uploadError } = await admin.storage
      .from(SOFTWARE_BUCKET)
      .upload(filePath, file, { upsert: true, contentType: file.type || undefined });
    if (uploadError) {
      return { error: `Upload failed: ${uploadError.message}` };
    }
  }

  // 2) Insert the product row.
  const { error: insertError } = await admin.from("products").insert({
    slug,
    name,
    vendor_id: vendorId,
    price_minor: Math.round(priceMajor * 100),
    currency,
    platform,
    category: String(formData.get("category") ?? "").trim(),
    tagline: String(formData.get("tagline") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    system_requirements: String(formData.get("system_requirements") ?? "").trim(),
    os_badges: osBadges,
    version: String(formData.get("version") || "1.0.0").trim(),
    file_path: filePath,
    file_name: fileName,
    file_size: fileSize,
  });

  if (insertError) {
    return {
      error: insertError.message.includes("duplicate")
        ? `A product with the slug "${slug}" already exists. Choose a different name or slug.`
        : `Could not save product: ${insertError.message}`,
    };
  }

  revalidatePath("/vendor/products");
  revalidatePath("/");
  redirect("/vendor/products");
}
