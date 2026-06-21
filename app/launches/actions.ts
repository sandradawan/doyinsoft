"use server";

import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { hasServiceRole } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";

/** Toggle the current visitor's upvote for a product (one vote per browser). */
export async function toggleUpvote(formData: FormData) {
  const productId = String(formData.get("id") ?? "");
  if (!productId || !hasServiceRole) return;

  const jar = await cookies();
  let voter = jar.get("voter")?.value;
  if (!voter) {
    voter = randomUUID();
    jar.set("voter", voter, { maxAge: 60 * 60 * 24 * 365, path: "/", sameSite: "lax" });
  }

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
    await admin.from("upvotes").insert({ product_id: productId, voter });
  }

  // Recompute the denormalized count.
  const { count } = await admin
    .from("upvotes")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);
  await admin.from("products").update({ upvotes: count ?? 0 }).eq("id", productId);

  revalidatePath("/launches");
}
