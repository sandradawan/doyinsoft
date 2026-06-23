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
  // Only allow same-origin relative paths — reject `//evil.com`, `/\evil.com`
  // and absolute URLs to prevent an open redirect.
  const next =
    nextParam.startsWith("/") && !nextParam.startsWith("//") && !nextParam.startsWith("/\\")
      ? nextParam
      : "/vendor/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/sign-in?notice=auth-error`);
}
