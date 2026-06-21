"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasServiceRole, isSupabaseConfigured } from "@/lib/supabase/env";

export interface ReviewState {
  error?: string;
  success?: string;
}

export async function addReview(
  _prev: ReviewState,
  formData: FormData
): Promise<ReviewState> {
  if (!isSupabaseConfigured) {
    return { error: "Connect Supabase to post reviews. (Sample reviews shown are demo data.)" };
  }

  const productId = String(formData.get("product_id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const authorName = String(formData.get("author_name") ?? "").trim() || "Anonymous";
  const rating = Number(formData.get("rating") ?? 0);
  const body = String(formData.get("body") ?? "").trim();

  if (!productId) return { error: "Missing product." };
  if (!(rating >= 1 && rating <= 5)) return { error: "Please choose a rating from 1 to 5." };

  const db = hasServiceRole ? createAdminClient() : await createClient();
  const { error } = await db.from("reviews").insert({
    product_id: productId,
    author_name: authorName,
    rating,
    body,
  });
  if (error) return { error: `Could not post review: ${error.message}` };

  if (slug) revalidatePath(`/products/${slug}`);
  return { success: "Thanks — your review has been posted." };
}
