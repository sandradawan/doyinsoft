import "server-only";
import { randomInt } from "crypto";
import { createAdminClient } from "./supabase/admin";
import { hasServiceRole } from "./supabase/env";

export interface AffiliateStats {
  code: string;
  earned_minor: number;
  referrals: number;
}

function codeFromEmail(email: string): string {
  const base = (email.split("@")[0] || "ref").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  // short, readable, reasonably unique — crypto-random suffix (6 digits).
  return `${base.slice(0, 8) || "ref"}${randomInt(100000, 1000000)}`;
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

/** Referral earnings credited today. */
export async function getAffiliateToday(
  affiliateId: string
): Promise<{ earned_minor: number; count: number }> {
  if (!hasServiceRole) return { earned_minor: 0, count: 0 };
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const { data } = await createAdminClient()
    .from("referrals")
    .select("amount_minor")
    .eq("affiliate_id", affiliateId)
    .gte("created_at", d.toISOString());
  const rows = (data as { amount_minor: number }[]) ?? [];
  return { earned_minor: rows.reduce((t, r) => t + (r.amount_minor || 0), 0), count: rows.length };
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

/**
 * True if the affiliate's own account email matches the buyer — used to block
 * self-referral (earning commission on your own purchases).
 */
export async function affiliateOwnsEmail(
  affiliateId: string | null,
  ...emails: (string | null | undefined)[]
): Promise<boolean> {
  if (!hasServiceRole || !affiliateId) return false;
  const { data } = await createAdminClient()
    .from("affiliates")
    .select("email")
    .eq("id", affiliateId)
    .maybeSingle();
  const affEmail = (data as { email?: string } | null)?.email?.toLowerCase();
  if (!affEmail) return false;
  return emails.some((e) => e && e.toLowerCase() === affEmail);
}

/** True if the affiliate account is owned by this signed-in user (blocks a
 *  logged-in affiliate self-referring even with a different buyer email). */
export async function affiliateOwnedByUser(
  affiliateId: string | null,
  userId: string | null
): Promise<boolean> {
  if (!hasServiceRole || !affiliateId || !userId) return false;
  const { data } = await createAdminClient()
    .from("affiliates")
    .select("owner")
    .eq("id", affiliateId)
    .maybeSingle();
  return (data as { owner?: string } | null)?.owner === userId;
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

const sum = (rows: { amount_minor: number }[] | null) =>
  (rows ?? []).reduce((t, r) => t + (r.amount_minor || 0), 0);

export interface AffiliateBalance {
  earned_minor: number;
  withdrawn_minor: number;
  available_minor: number;
}

export async function getAffiliateBalance(affiliateId: string): Promise<AffiliateBalance> {
  if (!hasServiceRole) return { earned_minor: 0, withdrawn_minor: 0, available_minor: 0 };
  const admin = createAdminClient();
  const [{ data: refs }, { data: outs }] = await Promise.all([
    admin.from("referrals").select("amount_minor").eq("affiliate_id", affiliateId),
    admin.from("affiliate_payouts").select("amount_minor").eq("affiliate_id", affiliateId),
  ]);
  const earned = sum(refs as { amount_minor: number }[]);
  const withdrawn = sum(outs as { amount_minor: number }[]);
  return {
    earned_minor: earned,
    withdrawn_minor: withdrawn,
    available_minor: Math.max(0, earned - withdrawn),
  };
}

export interface AffiliateBank {
  bank_code: string | null;
  account_name: string | null;
  account_number: string | null;
}

export async function getAffiliateBank(affiliateId: string): Promise<AffiliateBank> {
  if (!hasServiceRole) return { bank_code: null, account_name: null, account_number: null };
  const admin = createAdminClient();
  const { data } = await admin
    .from("affiliates")
    .select("bank_code, account_name, account_number")
    .eq("id", affiliateId)
    .maybeSingle();
  return {
    bank_code: data?.bank_code ?? null,
    account_name: data?.account_name ?? null,
    account_number: data?.account_number ?? null,
  };
}

export async function saveAffiliateBank(affiliateId: string, bank: AffiliateBank): Promise<void> {
  if (!hasServiceRole) return;
  await createAdminClient()
    .from("affiliates")
    .update({
      bank_code: bank.bank_code,
      account_name: bank.account_name,
      account_number: bank.account_number,
    })
    .eq("id", affiliateId);
}

export interface AffiliatePayout {
  id: string;
  amount_minor: number;
  status: string;
  created_at: string;
  paid_at: string | null;
}

export async function getAffiliatePayouts(affiliateId: string): Promise<AffiliatePayout[]> {
  if (!hasServiceRole) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("affiliate_payouts")
    .select("id, amount_minor, status, created_at, paid_at")
    .eq("affiliate_id", affiliateId)
    .order("created_at", { ascending: false });
  return (data as AffiliatePayout[]) ?? [];
}

/** Request a payout of the full available balance. Returns an error message or null. */
export async function requestAffiliatePayout(affiliateId: string): Promise<string | null> {
  if (!hasServiceRole) return "Connect Supabase to enable payouts.";
  const [bal, bank] = await Promise.all([
    getAffiliateBalance(affiliateId),
    getAffiliateBank(affiliateId),
  ]);
  if (!bank.bank_code || !bank.account_number) return "Add your bank details first.";
  if (bal.available_minor <= 0) return "No balance available to withdraw.";
  // The partial unique index (affiliate_payouts_one_pending) makes this atomic:
  // a concurrent/duplicate request hits a unique violation and is rejected, so a
  // balance can't be withdrawn twice.
  const { error } = await createAdminClient()
    .from("affiliate_payouts")
    .insert({ affiliate_id: affiliateId, amount_minor: bal.available_minor, status: "requested" });
  if (error) {
    if (error.code === "23505") return "You already have a payout request being processed.";
    return "Could not request payout. Please try again.";
  }
  return null;
}

// ---- Admin ----
export interface AdminAffiliatePayout extends AffiliatePayout {
  code: string;
  email: string | null;
  account_name: string | null;
  account_number: string | null;
  bank_code: string | null;
}

export const AFFILIATE_PAYOUTS_PAGE_SIZE = 4;

export async function adminAffiliatePayouts(
  page = 1,
  search?: string
): Promise<{ items: AdminAffiliatePayout[]; total: number }> {
  if (!hasServiceRole) return { items: [], total: 0 };
  const admin = createAdminClient();
  const { data } = await admin
    .from("affiliate_payouts")
    .select(
      "id, amount_minor, status, created_at, paid_at, affiliate:affiliates(code, email, account_name, account_number, bank_code)"
    )
    .order("created_at", { ascending: false })
    .limit(500);
  const mappedAll = (
    (data as (AffiliatePayout & {
      affiliate:
        | { code: string; email: string | null; account_name: string | null; account_number: string | null; bank_code: string | null }
        | { code: string; email: string | null; account_name: string | null; account_number: string | null; bank_code: string | null }[]
        | null;
    })[]) ?? []
  ).map((r) => {
    const a = Array.isArray(r.affiliate) ? r.affiliate[0] : r.affiliate;
    return {
      id: r.id,
      amount_minor: r.amount_minor,
      status: r.status,
      created_at: r.created_at,
      paid_at: r.paid_at,
      code: a?.code ?? "—",
      email: a?.email ?? null,
      account_name: a?.account_name ?? null,
      account_number: a?.account_number ?? null,
      bank_code: a?.bank_code ?? null,
    };
  });

  const q = search?.trim().toLowerCase();
  const filtered = q
    ? mappedAll.filter((p) => `${p.code} ${p.email ?? ""}`.toLowerCase().includes(q))
    : mappedAll;
  const start = (page - 1) * AFFILIATE_PAYOUTS_PAGE_SIZE;
  return {
    items: filtered.slice(start, start + AFFILIATE_PAYOUTS_PAGE_SIZE),
    total: filtered.length,
  };
}

export async function markAffiliatePayoutPaid(id: string): Promise<void> {
  if (!hasServiceRole) return;
  await createAdminClient()
    .from("affiliate_payouts")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", id);
}
