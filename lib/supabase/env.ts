// Single place to read Supabase env and decide whether it's configured.
// When unconfigured, the data layer falls back to built-in seed data so the
// app runs end-to-end without a backend.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Server-only. Used to mint signed download URLs and write licenses from the
// payment webhook — never exposed to the browser.
export const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const isSupabaseConfigured =
  SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

export const hasServiceRole =
  isSupabaseConfigured && SUPABASE_SERVICE_ROLE_KEY.length > 0;
