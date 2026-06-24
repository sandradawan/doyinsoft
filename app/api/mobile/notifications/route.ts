import { getNotifications, unreadCount, markRead } from "@/lib/notifications";
import { json, preflight, getMobileUser } from "@/lib/mobile/api";

export const dynamic = "force-dynamic";
export function OPTIONS() {
  return preflight();
}

/** GET /api/mobile/notifications — the user's notifications + unread count. */
export async function GET(request: Request) {
  const user = await getMobileUser(request);
  if (!user) return json({ error: "Unauthorized" }, 401);
  const [items, unread] = await Promise.all([getNotifications(user.email), unreadCount(user.email)]);
  return json({ unread, notifications: items });
}

/** POST /api/mobile/notifications { id? } — mark one or all as read. */
export async function POST(request: Request) {
  const user = await getMobileUser(request);
  if (!user) return json({ error: "Unauthorized" }, 401);
  let body: { id?: string } = {};
  try {
    body = (await request.json()) as { id?: string };
  } catch {
    // empty body = mark all
  }
  await markRead(user.email, body.id);
  return json({ ok: true });
}
