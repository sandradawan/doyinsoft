import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from "./env";

/**
 * Service-role client — bypasses RLS. Use ONLY in trusted server code
 * (payment webhook, signed-download route) AFTER verifying entitlement in app
 * logic. Never import this into a Client Component.
 */
export function createAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
