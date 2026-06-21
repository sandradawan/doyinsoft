"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hasServiceRole, isSupabaseConfigured } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
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

/** Best-effort display filename from a download URL. */
function fileNameFromUrl(url: string): string | null {
  try {
    const last = new URL(url).pathname.split("/").filter(Boolean).pop();
    return last && last.includes(".") ? decodeURIComponent(last) : null;
  } catch {
    return null;
  }
}

/**
 * Create a product. The binary is uploaded to Storage from the browser first
 * (see product-form.tsx) — here we only receive the resulting file metadata,
 * so the server action body stays tiny and the 1MB limit never applies.
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

  // External download link (vendor-hosted). Stored in file_path.
  const downloadUrl = String(formData.get("download_url") ?? "").trim();
  if (downloadUrl && !/^https?:\/\//i.test(downloadUrl)) {
    return { error: "The download link must start with http:// or https://" };
  }
  const filePath = downloadUrl || null;
  const fileName = downloadUrl ? fileNameFromUrl(downloadUrl) : null;
  const fileSizeMb = formData.get("file_size_mb");
  const fileSize = fileSizeMb ? Math.round(Number(fileSizeMb) * 1024 * 1024) : null;

  const admin = createAdminClient();
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
