"use client";

import { createClient } from "@/lib/supabase/client";
import { signMediaUpload } from "@/app/vendor/products/media";

/**
 * Upload an image to the public `media` bucket via a server-issued signed URL,
 * and return its public URL. Works for any image size, no auth-session reliance.
 */
export async function uploadImage(file: File): Promise<string> {
  const signed = await signMediaUpload(file.name);
  if (signed.error || !signed.path || !signed.token) {
    throw new Error(signed.error ?? "Could not start the image upload.");
  }
  const supabase = createClient();
  const { error } = await supabase.storage
    .from("media")
    .uploadToSignedUrl(signed.path, signed.token, file, {
      contentType: file.type || undefined,
    });
  if (error) throw new Error(error.message);

  return supabase.storage.from("media").getPublicUrl(signed.path).data.publicUrl;
}
