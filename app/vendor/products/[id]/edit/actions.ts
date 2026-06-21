"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hasServiceRole, isSupabaseConfigured } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentVendor, requireVendor } from "@/lib/auth";
import { getVendorProductById } from "@/lib/data";
import type { Currency, Platform } from "@/lib/types";

export interface EditProductState {
  error?: string;
}

function fileNameFromUrl(url: string): string | null {
  try {
    const last = new URL(url).pathname.split("/").filter(Boolean).pop();
    return last && last.includes(".") ? decodeURIComponent(last) : null;
  } catch {
    return null;
  }
}

const NEED_SUPABASE =
  "Editing products needs a connected Supabase project with a service-role key.";

export async function updateProduct(
  _prev: EditProductState,
  formData: FormData
): Promise<EditProductState> {
  if (!isSupabaseConfigured || !hasServiceRole) return { error: NEED_SUPABASE };

  const vendor = await getCurrentVendor();
  if (!vendor) return { error: "Please sign in as a vendor first." };

  const id = String(formData.get("id") ?? "");
  const existing = await getVendorProductById(id, vendor.id);
  if (!existing) return { error: "Product not found, or you don't own it." };

  const admin = createAdminClient();

  // External download link (vendor-hosted).
  const downloadUrl = String(formData.get("download_url") ?? "").trim();
  if (downloadUrl && !/^https?:\/\//i.test(downloadUrl)) {
    return { error: "The download link must start with http:// or https://" };
  }
  const fileSizeMb = formData.get("file_size_mb");
  const screenshots = String(formData.get("screenshots") ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const filePatch: Record<string, unknown> = {
    file_path: downloadUrl || null,
    file_name: downloadUrl ? fileNameFromUrl(downloadUrl) ?? existing.file_name : null,
    file_size: fileSizeMb ? Math.round(Number(fileSizeMb) * 1024 * 1024) : null,
    icon_url: String(formData.get("icon_url") ?? "").trim() || null,
    screenshots,
  };

  const osBadges = String(formData.get("os_badges") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const { error } = await admin
    .from("products")
    .update({
      name: String(formData.get("name") ?? "").trim() || existing.name,
      price_minor: Math.round((parseFloat(String(formData.get("price") ?? "0")) || 0) * 100),
      currency: (String(formData.get("currency") ?? existing.currency) as Currency),
      platform: (String(formData.get("platform") ?? existing.platform) as Platform),
      category: String(formData.get("category") ?? "").trim(),
      tagline: String(formData.get("tagline") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      system_requirements: String(formData.get("system_requirements") ?? "").trim(),
      os_badges: osBadges,
      version: String(formData.get("version") || existing.version).trim(),
      ...filePatch,
    })
    .eq("id", id)
    .eq("vendor_id", vendor.id);

  if (error) return { error: `Could not update: ${error.message}` };

  revalidatePath("/vendor/products");
  revalidatePath(`/products/${existing.slug}`);
  redirect("/vendor/products");
}

export async function deleteProduct(formData: FormData) {
  const vendor = await requireVendor();
  if (!isSupabaseConfigured || !hasServiceRole) redirect("/vendor/products");

  const id = String(formData.get("id") ?? "");
  const existing = await getVendorProductById(id, vendor.id);
  if (!existing) redirect("/vendor/products");

  const admin = createAdminClient();
  // Only remove from Storage if it was a stored file (legacy), not an external link.
  if (existing.file_path && !/^https?:\/\//i.test(existing.file_path)) {
    await admin.storage.from("software").remove([existing.file_path]);
  }
  await admin.from("products").delete().eq("id", id).eq("vendor_id", vendor.id);

  revalidatePath("/vendor/products");
  revalidatePath("/");
  redirect("/vendor/products");
}
