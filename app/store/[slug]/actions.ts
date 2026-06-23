"use server";

import { requireUser } from "@/lib/auth";
import { followerCount, toggleFollow } from "@/lib/follows";

export async function toggleFollowAction(
  vendorId: string
): Promise<{ following: boolean; count: number }> {
  const user = await requireUser();
  const following = await toggleFollow(vendorId, user.id, user.email);
  const count = await followerCount(vendorId);
  return { following, count };
}
