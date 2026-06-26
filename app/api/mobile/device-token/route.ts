import { createAdminClient } from "@/lib/supabase/admin";
import { hasServiceRole } from "@/lib/supabase/env";
import { json, preflight, getMobileUser } from "@/lib/mobile/api";

export function OPTIONS() {
  return preflight();
}

/**
 * POST /api/mobile/device-token  { token, platform } — register this device's FCM
 * token for the signed-in user so the server can push to it. Idempotent on token.
 */
export async function POST(request: Request) {
  const user = await getMobileUser(request);
  if (!user) return json({ error: "Unauthorized" }, 401);
  if (!hasServiceRole) return json({ error: "Unavailable" }, 503);

  let body: { token?: string; platform?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Bad request" }, 400);
  }
  const token = (body.token ?? "").trim();
  const platform = body.platform === "ios" ? "ios" : "android";
  if (!token) return json({ error: "Missing token" }, 400);

  // Upsert on the unique token: a device that re-registers (or switches user)
  // updates its owner + timestamp rather than duplicating.
  const { error } = await createAdminClient()
    .from("device_tokens")
    .upsert(
      { token, user_id: user.id, email: user.email || null, platform, updated_at: new Date().toISOString() },
      { onConflict: "token" }
    );
  if (error) return json({ error: "Could not register" }, 500);
  return json({ ok: true });
}

/** DELETE /api/mobile/device-token?token=... — unregister on sign-out. */
export async function DELETE(request: Request) {
  const user = await getMobileUser(request);
  if (!user) return json({ error: "Unauthorized" }, 401);
  if (!hasServiceRole) return json({ error: "Unavailable" }, 503);
  const token = new URL(request.url).searchParams.get("token")?.trim();
  if (!token) return json({ error: "Missing token" }, 400);
  await createAdminClient().from("device_tokens").delete().eq("token", token).eq("user_id", user.id);
  return json({ ok: true });
}
