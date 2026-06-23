"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hasServiceRole } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";

/**
 * Toggle the current user's upvote for a product. One vote per authenticated user
 * (enforced by the unique index on upvotes(product_id, voter)); cookie-based
 * "identity" was trivially Sybil-able, so a sign-in is required.
 */
export async function toggleUpvote(formData: FormData) {
  const productId = String(formData.get("id") ?? "");
  if (!productId || !hasServiceRole) return;

  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=/launches");
  const voter = user.id; // stable per-account identity, not a forgeable cookie

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("upvotes")
    .select("id")
    .eq("product_id", productId)
    .eq("voter", voter)
    .maybeSingle();

  if (existing) {
    await admin.from("upvotes").delete().eq("id", (existing as { id: string }).id);
  } else {
    // Ignore a duplicate-vote race (unique violation) — already counted.
    await admin
      .from("upvotes")
      .insert({ product_id: productId, voter })
      .then(() => undefined, () => undefined);
  }

  // Recompute the denormalized count.
  const { count } = await admin
    .from("upvotes")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);
  await admin.from("products").update({ upvotes: count ?? 0 }).eq("id", productId);

  revalidatePath("/launches");
}
