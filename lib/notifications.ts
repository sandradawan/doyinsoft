import "server-only";
import { createAdminClient } from "./supabase/admin";
import { hasServiceRole } from "./supabase/env";
import { pushToRecipient } from "./push";

export type NotificationType = "order" | "gift" | "launch" | "affiliate" | "follow" | "system";

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

/** Create an in-app notification for a recipient (by email and/or user id). Best-effort. */
export async function notify(opts: {
  email?: string | null;
  userId?: string | null;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}): Promise<void> {
  if (!hasServiceRole) return;
  const email = opts.email?.trim() || null;
  if (!email && !opts.userId) return;
  try {
    await createAdminClient().from("notifications").insert({
      email,
      user_id: opts.userId ?? null,
      type: opts.type,
      title: opts.title,
      body: opts.body ?? null,
      link: opts.link ?? null,
    });
  } catch {
    // notifications are non-critical — never block the triggering action
  }
  // Also deliver as a push to the recipient's devices (no-op until FCM is set up).
  await pushToRecipient(
    { userId: opts.userId, email },
    { title: opts.title, body: opts.body, link: opts.link }
  );
}

export async function getNotifications(email: string, limit = 50): Promise<AppNotification[]> {
  if (!hasServiceRole || !email) return [];
  const { data } = await createAdminClient()
    .from("notifications")
    .select("id, type, title, body, link, read, created_at")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as AppNotification[]) ?? [];
}

export async function unreadCount(email: string): Promise<number> {
  if (!hasServiceRole || !email) return 0;
  const { count } = await createAdminClient()
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("email", email)
    .eq("read", false);
  return count ?? 0;
}

/** Mark one (by id) or all of a user's notifications as read. */
export async function markRead(email: string, id?: string): Promise<void> {
  if (!hasServiceRole || !email) return;
  const base = createAdminClient().from("notifications").update({ read: true }).eq("email", email);
  await (id ? base.eq("id", id) : base.eq("read", false));
}
