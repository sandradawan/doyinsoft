import "server-only";
import { createAdminClient } from "./supabase/admin";
import { hasServiceRole } from "./supabase/env";
import { notify } from "./notifications";

/** Notify a store's owner that they gained a follower (best-effort; in-app + push). */
async function notifyNewFollower(
  vendorId: string,
  followerUserId: string,
  followerEmail?: string
): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: vendor } = await admin
      .from("vendors")
      .select("name, owner")
      .eq("id", vendorId)
      .maybeSingle();
    const v = vendor as { name?: string; owner?: string } | null;
    if (!v?.owner) return; // seed/demo vendor with no auth owner
    if (v.owner === followerUserId) return; // don't notify on self-follow
    const { data: u } = await admin.auth.admin.getUserById(v.owner);
    const ownerEmail = u?.user?.email ?? null;
    const who = followerEmail ? followerEmail.split("@")[0] : "Someone";
    await notify({
      email: ownerEmail,
      userId: v.owner,
      type: "follow",
      title: "New follower 🎉",
      body: `${who} started following ${v.name ?? "your store"}.`,
      link: "/vendor/dashboard",
    });
  } catch {
    // follower notifications are non-critical — never block the follow
  }
}

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
  await notifyNewFollower(vendorId, userId, email);
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
