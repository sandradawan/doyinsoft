import "server-only";
import { headers } from "next/headers";

// Best-effort in-memory rate limit. Resets per server instance, so it's a basic
// guard rather than a hard limit — swap for a shared store (Upstash, etc.) when
// you need strict enforcement across instances.
const hits = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const e = hits.get(key);
  if (!e || now > e.reset) {
    hits.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (e.count >= max) return false;
  e.count++;
  return true;
}

/** Best-effort client identifier from request headers. */
export async function clientId(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}

/** True if a hidden honeypot field was filled (i.e. likely a bot). */
export function isBot(formData: FormData, field = "website"): boolean {
  return String(formData.get(field) ?? "").trim().length > 0;
}
