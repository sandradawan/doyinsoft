import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { isSupabaseConfigured } from "./supabase/env";
import { DEMO_VENDOR_ID } from "./data";
import { vendors as seedVendors } from "./seed-data";
import type { Vendor } from "./types";

export interface SessionVendor extends Vendor {
  email: string;
  /** True when running on seed data (no Supabase) — dashboard is open as demo. */
  isDemo: boolean;
}

/**
 * The vendor for the current request, or null if not signed in.
 * In demo mode (no Supabase) returns the seed vendor so the dashboard works.
 */
export async function getCurrentVendor(): Promise<SessionVendor | null> {
  if (!isSupabaseConfigured) {
    const demo = seedVendors.find((v) => v.id === DEMO_VENDOR_ID) ?? seedVendors[0];
    return demo ? { ...demo, email: "demo@doyinsoft.dev", isDemo: true } : null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("vendors")
    .select("id, slug, name, initials, verified")
    .eq("owner", user.id)
    .maybeSingle();
  if (!data) return null;

  return { ...(data as Vendor), email: user.email ?? "", isDemo: false };
}

/** Require a signed-in vendor; redirect to sign-in otherwise. */
export async function requireVendor(): Promise<SessionVendor> {
  const vendor = await getCurrentVendor();
  if (!vendor) redirect("/sign-in?next=/vendor/dashboard");
  return vendor;
}
