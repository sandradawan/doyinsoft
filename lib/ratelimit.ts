import "server-only";
import { headers } from "next/headers";

// Distributed rate limiting.
//
// When UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set, limits are
// enforced atomically in Redis — shared across every serverless instance, so an
// attacker can't reset the counter by hopping cold starts. Without those env
// vars it falls back to a best-effort in-memory counter (fine for local/dev).
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL ?? "";
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? "";
export const hasDistributedRateLimit = Boolean(UPSTASH_URL && UPSTASH_TOKEN);

// --- In-memory fallback (per-instance) ---------------------------------------
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

// --- Upstash (Redis REST) ----------------------------------------------------
// One atomic pipeline: INCR the key, and set its TTL on first hit (EX … NX).
async function upstashAllow(key: string, max: number, windowSec: number): Promise<boolean> {
  const res = await fetch(`${UPSTASH_URL}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      ["INCR", key],
      ["EXPIRE", key, windowSec, "NX"],
    ]),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Upstash ${res.status}`);
  const out = (await res.json()) as { result: number }[];
  const count = Number(out?.[0]?.result ?? 0);
  return count <= max;
}

/**
 * Allow this action? Returns true if under the limit. Uses Redis when configured
 * (atomic, cross-instance) and falls back to the in-memory counter otherwise.
 * Fails OPEN (allows) only if Redis is configured but unreachable, after also
 * applying the in-memory guard — so a Redis outage never hard-blocks the app.
 */
export async function checkRateLimit(
  key: string,
  max: number,
  windowMs: number
): Promise<boolean> {
  if (hasDistributedRateLimit) {
    try {
      return await upstashAllow(`rl:${key}`, max, Math.ceil(windowMs / 1000));
    } catch {
      // Redis hiccup — degrade to the local guard rather than locking users out.
      return rateLimit(key, max, windowMs);
    }
  }
  return rateLimit(key, max, windowMs);
}

/**
 * Health probe for the rate-limit backend. Returns:
 *  - "connected"      — Upstash configured and responding to PING
 *  - "unreachable"    — Upstash configured but the request failed
 *  - "not-configured" — no Upstash env (using the in-memory fallback)
 */
export async function rateLimitStoreStatus(): Promise<
  "connected" | "unreachable" | "not-configured"
> {
  if (!hasDistributedRateLimit) return "not-configured";
  try {
    const res = await fetch(`${UPSTASH_URL}/ping`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
      cache: "no-store",
    });
    return res.ok ? "connected" : "unreachable";
  } catch {
    return "unreachable";
  }
}

/**
 * Best-effort client identifier. On Vercel the platform sets x-forwarded-for to
 * the real client IP; the leftmost entry is the originating address.
 */
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
