import "server-only";
import { createAdminClient } from "./supabase/admin";
import { hasServiceRole } from "./supabase/env";

export interface AffiliateStats {
  code: string;
  earned_minor: number;
  referrals: number;
}

function codeFromEmail(email: string): string {
  const base = (email.split("@")[0] || "ref").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  // short, readable, reasonably unique
  return `${base.slice(0, 8) || "ref"}${Math.floor(Math.random() * 9000 + 1000)}`;
}

/** Get the user's affiliate code, creating one on first use. */
export async function getOrCreateAffiliate(
  userId: string,
  email: string
): Promise<{ id: string; code: string } | null> {
  if (!hasServiceRole) return { id: "demo", code: "demo1234" };
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("affiliates")
    .select("id, code")
    .eq("owner", userId)
    .maybeSingle();
  if (existing) return existing as { id: string; code: string };

  // Create with a unique code (retry a couple of times on collision).
  for (let i = 0; i < 3; i++) {
    const code = codeFromEmail(email);
    const { data, error } = await admin
      .from("affiliates")
      .insert({ owner: userId, email, code })
      .select("id, code")
      .single();
    if (!error && data) return data as { id: string; code: string };
  }
  return null;
}

export async function getAffiliateStats(affiliateId: string): Promise<AffiliateStats | null> {
  if (!hasServiceRole) return { code: "demo1234", earned_minor: 0, referrals: 0 };
  const admin = createAdminClient();
  const { data: aff } = await admin
    .from("affiliates")
    .select("code")
    .eq("id", affiliateId)
    .maybeSingle();
  if (!aff) return null;
  const { data: refs } = await admin
    .from("referrals")
    .select("amount_minor")
    .eq("affiliate_id", affiliateId);
  const rows = (refs as { amount_minor: number }[]) ?? [];
  return {
    code: (aff as { code: string }).code,
    earned_minor: rows.reduce((t, r) => t + (r.amount_minor || 0), 0),
    referrals: rows.length,
  };
}

/** Resolve a referral code to an affiliate id (for attributing an order). */
export async function resolveAffiliateId(code: string): Promise<string | null> {
  if (!hasServiceRole || !code) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("affiliates")
    .select("id")
    .eq("code", code)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}
