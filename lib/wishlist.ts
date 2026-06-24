import "server-only";
import { createAdminClient } from "./supabase/admin";
import { hasServiceRole } from "./supabase/env";
import { getProductsByIds } from "./data";
import type { Product } from "./types";

/** Product ids the user has saved. */
export async function wishlistIds(userId: string): Promise<string[]> {
  if (!hasServiceRole || !userId) return [];
  const { data } = await createAdminClient().from("wishlists").select("product_id").eq("user_id", userId);
  return ((data as { product_id: string }[]) ?? []).map((r) => r.product_id);
}

/** Full saved products for the user. */
export async function getWishlistProducts(userId: string): Promise<Product[]> {
  const ids = await wishlistIds(userId);
  return ids.length ? getProductsByIds(ids) : [];
}

export async function isWishlisted(userId: string, productId: string): Promise<boolean> {
  if (!hasServiceRole || !userId || !productId) return false;
  const { data } = await createAdminClient()
    .from("wishlists")
    .select("id")
    .eq("user_id", userId)
    .eq("product_id", productId)
    .maybeSingle();
  return Boolean(data);
}

/** Toggle saved state. Returns the new state (true = now saved). */
export async function toggleWishlist(userId: string, productId: string): Promise<boolean> {
  if (!hasServiceRole || !userId || !productId) return false;
  const admin = createAdminClient();
  const { data } = await admin
    .from("wishlists")
    .select("id")
    .eq("user_id", userId)
    .eq("product_id", productId)
    .maybeSingle();
  if (data) {
    await admin.from("wishlists").delete().eq("id", (data as { id: string }).id);
    return false;
  }
  await admin.from("wishlists").insert({ user_id: userId, product_id: productId });
  return true;
}
