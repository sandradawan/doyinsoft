import "server-only";
import { hasServiceRole } from "./supabase/env";
import { createAdminClient } from "./supabase/admin";

export type DiscountType = "percent" | "fixed";

export interface Coupon {
  id: string;
  code: string;
  /** null = platform-wide (any product); else only this vendor's products. */
  vendor_id: string | null;
  discount_type: DiscountType;
  /** percent: 1–100; fixed: NGN kobo. */
  discount_value: number;
  active: boolean;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  created_at: string;
}

const SELECT =
  "id, code, vendor_id, discount_type, discount_value, active, max_uses, used_count, expires_at, created_at";

/** The discount (in minor units) a coupon applies to a charge — clamped to [0, charge]. */
export function computeDiscount(
  chargeMinor: number,
  c: Pick<Coupon, "discount_type" | "discount_value">
): number {
  const raw =
    c.discount_type === "percent"
      ? Math.round((chargeMinor * c.discount_value) / 100)
      : c.discount_value;
  return Math.max(0, Math.min(raw, chargeMinor));
}

export interface CouponCheck {
  ok: boolean;
  error?: string;
  code?: string;
  label?: string; // e.g. "20% off" / "₦500 off"
  discountMinor?: number;
  finalMinor?: number;
}

/** Human label for a coupon's value. */
export function couponLabel(c: Pick<Coupon, "discount_type" | "discount_value">): string {
  return c.discount_type === "percent"
    ? `${c.discount_value}% off`
    : `₦${(c.discount_value / 100).toLocaleString("en-NG")} off`;
}

/**
 * Validate a coupon against a specific purchase. Server-authoritative —
 * the checkout UI previews with this, and startCheckout re-runs it before charging.
 */
export async function validateCoupon(
  rawCode: string,
  opts: { chargeMinor: number; productVendorId: string | null }
): Promise<CouponCheck> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: "Enter a code." };
  if (!hasServiceRole) return { ok: false, error: "Coupons are unavailable right now." };

  const admin = createAdminClient();
  const { data } = await admin.from("coupons").select(SELECT).eq("code", code).maybeSingle();
  const c = data as Coupon | null;

  if (!c || !c.active) return { ok: false, error: "That code isn’t valid." };
  if (c.expires_at && new Date(c.expires_at).getTime() < Date.now())
    return { ok: false, error: "This code has expired." };
  if (c.max_uses != null && c.used_count >= c.max_uses)
    return { ok: false, error: "This code has reached its usage limit." };
  if (c.vendor_id && c.vendor_id !== opts.productVendorId)
    return { ok: false, error: "This code doesn’t apply to this item." };

  const discountMinor = computeDiscount(opts.chargeMinor, c);
  return {
    ok: true,
    code: c.code,
    label: couponLabel(c),
    discountMinor,
    finalMinor: opts.chargeMinor - discountMinor,
  };
}

/** List a vendor's coupons, or platform-wide coupons when vendorId is null. */
export async function listCoupons(vendorId: string | null): Promise<Coupon[]> {
  if (!hasServiceRole) return [];
  const admin = createAdminClient();
  const base = admin.from("coupons").select(SELECT).order("created_at", { ascending: false });
  const { data } = await (vendorId === null
    ? base.is("vendor_id", null)
    : base.eq("vendor_id", vendorId));
  return (data as Coupon[]) ?? [];
}

export interface CreateCouponInput {
  code: string;
  vendorId: string | null;
  discount_type: DiscountType;
  discount_value: number; // percent 1–100, or fixed NGN kobo
  max_uses: number | null;
  expires_at: string | null;
}

export async function createCoupon(
  input: CreateCouponInput
): Promise<{ ok: boolean; error?: string }> {
  if (!hasServiceRole) return { ok: false, error: "Coupons need a configured database." };
  const code = input.code.trim().toUpperCase().replace(/\s+/g, "");
  if (!/^[A-Z0-9_-]{3,24}$/.test(code))
    return { ok: false, error: "Code must be 3–24 characters (A–Z, 0–9, - or _)." };
  if (input.discount_type === "percent" && (input.discount_value < 1 || input.discount_value > 100))
    return { ok: false, error: "Percentage must be between 1 and 100." };
  if (input.discount_type === "fixed" && input.discount_value < 1)
    return { ok: false, error: "Amount must be greater than zero." };

  const admin = createAdminClient();
  const { error } = await admin.from("coupons").insert({
    code,
    vendor_id: input.vendorId,
    discount_type: input.discount_type,
    discount_value: input.discount_value,
    max_uses: input.max_uses,
    expires_at: input.expires_at,
  });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "That code already exists." };
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/** Toggle / delete scoped to the owner (vendorId null = platform) so vendors can't touch others'. */
export async function setCouponActive(
  id: string,
  vendorId: string | null,
  active: boolean
): Promise<void> {
  if (!hasServiceRole || !id) return;
  const admin = createAdminClient();
  const q = admin.from("coupons").update({ active }).eq("id", id);
  await (vendorId === null ? q.is("vendor_id", null) : q.eq("vendor_id", vendorId));
}

export async function deleteCoupon(id: string, vendorId: string | null): Promise<void> {
  if (!hasServiceRole || !id) return;
  const admin = createAdminClient();
  const q = admin.from("coupons").delete().eq("id", id);
  await (vendorId === null ? q.is("vendor_id", null) : q.eq("vendor_id", vendorId));
}

/** Redemption totals for a vendor: how many paid orders used a code, and ₦ discounted. */
export async function vendorCouponStats(
  vendorId: string
): Promise<{ redeemed: number; discount_minor: number }> {
  if (!hasServiceRole) return { redeemed: 0, discount_minor: 0 };
  const admin = createAdminClient();
  const { data } = await admin
    .from("orders")
    .select("discount_minor")
    .eq("vendor_id", vendorId)
    .eq("status", "paid")
    .gt("discount_minor", 0);
  const rows = (data as { discount_minor: number }[]) ?? [];
  return {
    redeemed: rows.length,
    discount_minor: rows.reduce((s, r) => s + (r.discount_minor || 0), 0),
  };
}

/** Bump used_count once a discounted order is paid (called from issueLicenseForOrder). */
export async function incrementCouponUse(code: string): Promise<void> {
  if (!hasServiceRole || !code) return;
  const admin = createAdminClient();
  await admin.rpc("increment_coupon_use", { p_code: code });
}
