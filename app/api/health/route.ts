import { NextResponse } from "next/server";
import { isSupabaseConfigured, hasServiceRole, isDemoMode } from "@/lib/supabase/env";
import { isPaystackConfigured } from "@/lib/paystack";
import { isEmailConfigured } from "@/lib/email";
import { rateLimitStoreStatus } from "@/lib/ratelimit";

/**
 * Lightweight health/config probe. Returns only booleans + a status string — no
 * secrets — so it's safe to hit after a deploy to confirm env vars landed.
 *
 *   GET /api/health
 */
export async function GET() {
  const rateLimitStore = await rateLimitStoreStatus();

  return NextResponse.json(
    {
      ok: true,
      services: {
        supabase: isSupabaseConfigured,
        serviceRole: hasServiceRole,
        paystack: isPaystackConfigured,
        email: isEmailConfigured,
        rateLimitStore, // "connected" | "unreachable" | "not-configured"
      },
      // Should always be false in production — true means demo identities are open.
      demoMode: isDemoMode,
      env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
    },
    { headers: { "cache-control": "no-store" } }
  );
}
