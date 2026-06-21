"use server";

import { hasServiceRole, isSupabaseConfigured } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentVendor } from "@/lib/auth";

export interface SignedMediaUpload {
  path?: string;
  token?: string;
  error?: string;
}

/** Issue a signed upload URL into the public `media` bucket for the vendor. */
export async function signMediaUpload(fileName: string): Promise<SignedMediaUpload> {
  if (!isSupabaseConfigured || !hasServiceRole) {
    return { error: "Image uploads need a connected Supabase project with a service-role key." };
  }
  const vendor = await getCurrentVendor();
  if (!vendor) return { error: "Please sign in as a vendor first." };

  const safe = (fileName || "image").replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${vendor.id}/${Date.now()}-${Math.floor(performance.now())}-${safe}`;

  const admin = createAdminClient();
  const { data, error } = await admin.storage.from("media").createSignedUploadUrl(path);
  if (error || !data) return { error: error?.message ?? "Could not create an upload URL." };
  return { path: data.path, token: data.token };
}
