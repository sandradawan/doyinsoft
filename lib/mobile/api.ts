import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY, hasServiceRole } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";

// Shared helpers for the /api/mobile/* REST surface consumed by the Flutter apps.
// Reads go through the same lib/data functions the web uses; auth is by the
// Supabase access token (Bearer), validated here.

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "cache-control": "no-store",
};

export function json(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status, headers: CORS });
}

/**
 * Like json() but cacheable at the CDN/edge for PUBLIC, non-user-specific reads
 * (catalog, stores, product, config). At scale most requests are served from the
 * Vercel edge cache instead of hitting the function + database.
 */
export function jsonCached(data: unknown, maxAge = 60): NextResponse {
  return NextResponse.json(data, {
    status: 200,
    headers: {
      ...CORS,
      "cache-control": `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 4}`,
    },
  });
}

/** Preflight handler — export as OPTIONS from each route. */
export function preflight(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export interface MobileUser {
  id: string;
  email: string;
}

/**
 * Validate the Supabase access token from `Authorization: Bearer <jwt>`.
 * Returns the user or null. The token is verified against Supabase Auth — the
 * app never sends the service role, and RLS still applies to anything it reads
 * directly via supabase_flutter.
 */
export async function getMobileUser(request: Request): Promise<MobileUser | null> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token || !SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? "" };
}

/** The vendor (store) id owned by a user, or null if they don't have a store. */
export async function getVendorIdForUser(userId: string): Promise<string | null> {
  if (!hasServiceRole || !userId) return null;
  const { data } = await createAdminClient()
    .from("vendors")
    .select("id")
    .eq("owner", userId)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}
