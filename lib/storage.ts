import "server-only";
import { createAdminClient } from "./supabase/admin";
import { hasServiceRole } from "./supabase/env";

export const SOFTWARE_BUCKET = "software";
const SIGNED_URL_TTL_SECONDS = 600; // 10 minutes

/**
 * Mint a short-lived signed URL for a private software file.
 * Returns null when storage isn't available (mock mode) — the caller then
 * falls back to streaming a license certificate instead.
 */
export async function getSignedDownloadUrl(
  filePath: string,
  downloadName?: string
): Promise<string | null> {
  if (!hasServiceRole || !filePath) return null;
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(SOFTWARE_BUCKET)
    .createSignedUrl(filePath, SIGNED_URL_TTL_SECONDS, {
      download: downloadName ?? true,
    });
  if (error || !data) return null;
  return data.signedUrl;
}
