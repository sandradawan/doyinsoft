import { createAdminClient } from "@/lib/supabase/admin";
import { hasServiceRole } from "@/lib/supabase/env";
import { json, preflight, getMobileUser } from "@/lib/mobile/api";

export const dynamic = "force-dynamic";
export function OPTIONS() {
  return preflight();
}

/** POST /api/mobile/account/delete — permanently delete the signed-in user. */
export async function POST(request: Request) {
  const user = await getMobileUser(request);
  if (!user) return json({ error: "Unauthorized" }, 401);
  if (!hasServiceRole) return json({ error: "Account deletion is unavailable." }, 503);

  const admin = createAdminClient();
  // Remove app data tied to the user (follows cascade via FK on auth.users).
  await admin.from("wishlists").delete().eq("user_id", user.id);

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return json({ error: error.message }, 400);
  return json({ ok: true });
}
