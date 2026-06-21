"use server";

import { hasServiceRole, isSupabaseConfigured } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentVendor } from "@/lib/auth";

export interface SignedUpload {
  path?: string;
  token?: string;
  error?: string;
}

/**
 * Issue a one-time signed upload URL for the current vendor's folder, using the
 * service role after confirming the caller is a vendor. The browser then uploads
 * straight to Storage with this token — no dependency on the browser's auth
 * session, and storage RLS is satisfied by the service role.
 */
export async function createSignedUpload(fileName: string): Promise<SignedUpload> {
  if (!isSupabaseConfigured || !hasServiceRole) {
    return {
      error:
        "File uploads need a connected Supabase project with a service-role key set in the deployment's environment variables.",
    };
  }

  const vendor = await getCurrentVendor();
  if (!vendor) return { error: "Please sign in as a vendor first." };

  const safe = (fileName || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${vendor.id}/${Date.now()}-${safe}`;

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("software")
    .createSignedUploadUrl(path);

  if (error || !data) {
    return { error: error?.message ?? "Could not create an upload URL." };
  }
  return { path: data.path, token: data.token };
}
