import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/env";

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
