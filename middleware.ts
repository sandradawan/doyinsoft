import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);
  // Affiliate attribution: remember ?ref=CODE for 30 days.
  const ref = request.nextUrl.searchParams.get("ref");
  if (ref) {
    response.cookies.set("ref", ref, {
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
      sameSite: "lax",
    });
  }
  return response;
}

export const config = {
  matcher: [
    // Run on all paths except static assets and files with extensions.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)",
  ],
};
