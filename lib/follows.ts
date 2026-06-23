import "server-only";
import { createAdminClient } from "./supabase/admin";
import { hasServiceRole } from "./supabase/env";

export async function isFollowing(vendorId: string, userId: string): Promise<boolean> {
  if (!hasServiceRole) return false;
  try {
    const { data } = await createAdminClient()
      .from("follows")
      .select("id")
      .eq("vendor_id", vendorId)
      .eq("user_id", userId)
      .maybeSingle();
    return Boolean(data);
  } catch {
    return false;
  }
}

export async function followerCount(vendorId: string): Promise<number> {
  if (!hasServiceRole) return 0;
  try {
    const { count } = await createAdminClient()
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("vendor_id", vendorId);
    return count ?? 0;
  } catch {
    return 0;
  }
}

/** Toggle follow state. Returns the new state (true = now following). */
export async function toggleFollow(
  vendorId: string,
  userId: string,
  email: string
): Promise<boolean> {
  if (!hasServiceRole) return false;
  const admin = createAdminClient();
  const { data } = await admin
    .from("follows")
    .select("id")
    .eq("vendor_id", vendorId)
    .eq("user_id", userId)
    .maybeSingle();
  if (data) {
    await admin.from("follows").delete().eq("id", (data as { id: string }).id);
    return false;
  }
  await admin.from("follows").insert({ vendor_id: vendorId, user_id: userId, email });
  return true;
}

export interface FollowedVendor {
  id: string;
  slug: string;
  name: string;
  initials: string;
  verified: boolean;
}

/** Vendors a user follows. */
export async function getFollowedVendors(userId: string): Promise<FollowedVendor[]> {
  if (!hasServiceRole) return [];
  try {
    const { data } = await createAdminClient()
      .from("follows")
      .select("vendor:vendors(id, slug, name, initials, verified)")
      .eq("user_id", userId);
    return ((data as { vendor: FollowedVendor | FollowedVendor[] | null }[]) ?? [])
      .map((r) => (Array.isArray(r.vendor) ? r.vendor[0] : r.vendor))
      .filter((v): v is FollowedVendor => Boolean(v));
  } catch {
    return [];
  }
}

/** Emails of everyone following a vendor (for new-product notifications). */
export async function vendorFollowerEmails(vendorId: string): Promise<string[]> {
  if (!hasServiceRole) return [];
  try {
    const { data } = await createAdminClient()
      .from("follows")
      .select("email")
      .eq("vendor_id", vendorId);
    return ((data as { email: string | null }[]) ?? [])
      .map((r) => r.email)
      .filter((e): e is string => Boolean(e));
  } catch {
    return [];
  }
}
