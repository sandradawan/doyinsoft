import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { isSupabaseConfigured } from "./supabase/env";

/** Comma-separated list of admin emails, e.g. ADMIN_EMAILS="you@gmail.com,co@x.com" */
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

/** The signed-in admin's email, or null if the current user isn't an admin. */
export async function getCurrentAdmin(): Promise<string | null> {
  if (!isSupabaseConfigured) {
    // Demo mode: open the admin panel so it's explorable without a backend.
    return "demo-admin@doyinsoft.dev";
  }
  if (ADMIN_EMAILS.length === 0) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email?.toLowerCase();
  return email && ADMIN_EMAILS.includes(email) ? email : null;
}

export async function isAdmin(): Promise<boolean> {
  return (await getCurrentAdmin()) !== null;
}

/** Require an admin; redirect to sign-in otherwise. */
export async function requireAdmin(): Promise<string> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/sign-in?next=/admin");
  return admin;
}
