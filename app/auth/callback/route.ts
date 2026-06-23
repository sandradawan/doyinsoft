import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Email-confirmation / OAuth callback. Exchanges the code for a session, then
 * redirects to `next` (defaults to the vendor dashboard).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/vendor/dashboard";
  // Resolve `next` against our own origin and only accept it if it stays
  // same-origin. This is robust against `//evil.com`, `/\evil.com`, backslash
  // tricks and absolute URLs (which all resolve to a different origin) — far
  // safer than prefix-denylisting.
  let next = "/vendor/dashboard";
  try {
    const resolved = new URL(nextParam, origin);
    if (resolved.origin === origin) next = resolved.pathname + resolved.search + resolved.hash;
  } catch {
    // malformed → keep the safe default
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/sign-in?notice=auth-error`);
}
