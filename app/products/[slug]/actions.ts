"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasServiceRole, isSupabaseConfigured } from "@/lib/supabase/env";
import { getCurrentUser } from "@/lib/auth";
import { hasPurchased } from "@/lib/data";
import { checkRateLimit, clientId, isBot } from "@/lib/ratelimit";

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
  const rating = Number(formData.get("rating") ?? 0);
  const body = String(formData.get("body") ?? "").trim();

  if (!productId) return { error: "Missing product." };
  if (!(rating >= 1 && rating <= 5)) return { error: "Please choose a rating from 1 to 5." };

  // Abuse guards: silently drop bots (honeypot) and rate-limit per IP.
  if (isBot(formData)) return { success: "Thanks — your review has been posted." };
  if (!(await checkRateLimit(`review:${await clientId()}`, 5, 60_000))) {
    return { error: "You're posting too fast — please try again shortly." };
  }

  // Verified-purchase only.
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in to review." };
  const purchased = await hasPurchased(productId, user.email);
  if (!purchased) return { error: "Only buyers who purchased this product can review it." };

  const authorName =
    String(formData.get("author_name") ?? "").trim() || user.email.split("@")[0] || "Verified buyer";

  // Upsert so a buyer can update their review but not flood new ones
  // (unique product_id+user_id). user_id binds the review to its author.
  const db = hasServiceRole ? createAdminClient() : await createClient();
  const { error } = await db.from("reviews").upsert(
    { product_id: productId, user_id: user.id, author_name: authorName, rating, body },
    { onConflict: "product_id,user_id" }
  );
  if (error) return { error: `Could not post review: ${error.message}` };

  if (slug) revalidatePath(`/products/${slug}`);
  return { success: "Thanks — your review has been posted." };
}
