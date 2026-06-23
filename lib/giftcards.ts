import "server-only";
import { randomBytes } from "crypto";
import { createAdminClient } from "./supabase/admin";
import { hasServiceRole } from "./supabase/env";
import { sendEmail, emailLayout, emailText, emailKeyBox, emailButton, esc, subjectSafe } from "./email";
import { formatPrice } from "./format";
import { giftDesign, giftGradient } from "./gift-designs";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Purchase bounds (NGN kobo). Tiers shown in the UI; custom must be in range.
export const GIFT_MIN_MINOR = 50_000; // ₦500
export const GIFT_MAX_MINOR = 50_000_000; // ₦500,000
export const GIFT_TIERS_MINOR = [100_000, 200_000, 500_000, 1_000_000, 2_000_000];

export interface GiftCard {
  id: string;
  code: string;
  vendor_id: string | null;
  initial_minor: number;
  balance_minor: number;
  currency: "NGN" | "USD";
  status: "active" | "depleted" | "disabled" | "expired";
  recipient_email: string | null;
  expires_at: string | null;
  created_at: string;
}

const SELECT =
  "id, code, vendor_id, initial_minor, balance_minor, currency, status, recipient_email, expires_at, created_at";

/** A fresh, unguessable code: GIFT-XXXX-XXXX-XXXX-XXXX (hex, uppercase). */
export function generateGiftCardCode(): string {
  const seg = () => randomBytes(2).toString("hex").toUpperCase();
  return `GIFT-${seg()}-${seg()}-${seg()}-${seg()}`;
}

export interface GiftCardCheck {
  ok: boolean;
  error?: string;
  code?: string;
  balance_minor?: number;
}

/** Validate a code for redemption/balance display. Server-authoritative. */
export async function validateGiftCard(rawCode: string): Promise<GiftCardCheck> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: "Enter a gift card code." };
  if (!hasServiceRole) return { ok: false, error: "Gift cards are unavailable right now." };

  const { data } = await createAdminClient().from("gift_cards").select(SELECT).eq("code", code).maybeSingle();
  const c = data as GiftCard | null;
  // Deliberately generic errors (don't distinguish invalid vs empty) to deter enumeration.
  if (!c || c.status === "disabled") return { ok: false, error: "This gift card code isn’t valid." };
  if (c.status === "depleted" || c.balance_minor <= 0)
    return { ok: false, error: "This gift card has no balance left." };
  if (c.expires_at && new Date(c.expires_at).getTime() < Date.now())
    return { ok: false, error: "This gift card has expired." };
  return { ok: true, code: c.code, balance_minor: c.balance_minor };
}

/** Atomic, idempotent redeem against an order. Returns the amount actually debited. */
export async function redeemGiftCard(code: string, amountMinor: number, orderId: string): Promise<number> {
  if (!hasServiceRole || !code || amountMinor <= 0) return 0;
  const { data } = await createAdminClient().rpc("redeem_gift_card", {
    p_code: code.toUpperCase(),
    p_amount: amountMinor,
    p_order: orderId,
  });
  return Number(data ?? 0);
}

/**
 * Issue a gift card for a completed Paystack purchase. Idempotent on the payment
 * reference, and uses the AMOUNT ACTUALLY PAID (never a client-supplied number).
 * Emails the code to the recipient (or the purchaser). Returns the code.
 */
export async function issueGiftCardFromPayment(opts: {
  reference: string;
  amountMinor: number;
  purchaserEmail?: string;
  recipientEmail?: string;
  message?: string;
  design?: string;
}): Promise<string | null> {
  if (!hasServiceRole || !opts.reference || opts.amountMinor <= 0) return null;
  const admin = createAdminClient();

  // Already issued for this payment? Return the existing code (idempotent).
  const { data: existing } = await admin
    .from("gift_cards")
    .select("code")
    .eq("purchase_reference", opts.reference)
    .maybeSingle();
  if (existing) return (existing as { code: string }).code;

  const recipient = (opts.recipientEmail || opts.purchaserEmail || "").trim();
  let code = generateGiftCardCode();
  // Retry once on the (astronomically unlikely) code collision.
  for (let i = 0; i < 2; i++) {
    const { data, error } = await admin
      .from("gift_cards")
      .insert({
        code,
        initial_minor: opts.amountMinor,
        balance_minor: opts.amountMinor,
        currency: "NGN",
        status: "active",
        purchaser_email: opts.purchaserEmail ?? null,
        recipient_email: recipient || null,
        message: opts.message ?? null,
        design: giftDesign(opts.design).key,
        purchase_reference: opts.reference,
      })
      .select("code")
      .single();
    if (!error && data) {
      code = (data as { code: string }).code;
      break;
    }
    // Unique violation on purchase_reference → another worker issued it; fetch + return.
    if (error?.code === "23505") {
      const { data: dup } = await admin
        .from("gift_cards")
        .select("code")
        .eq("purchase_reference", opts.reference)
        .maybeSingle();
      if (dup) return (dup as { code: string }).code;
      code = generateGiftCardCode(); // code collision — retry with a new one
      continue;
    }
    return null;
  }

  if (recipient) {
    const amountStr = formatPrice(opts.amountMinor, "NGN");
    const d = giftDesign(opts.design);
    const note = opts.message ? emailText(`“${esc(opts.message)}”`) : "";
    // A themed gift-card "face" rendered with inline styles (email-safe).
    const cardFace = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;">
      <tr><td style="background:${giftGradient(d)};border-radius:16px;padding:22px 20px;color:#ffffff;">
        <table role="presentation" width="100%"><tr>
          <td style="font-size:14px;font-weight:700;color:#ffffff;">DoyinMart</td>
          <td style="text-align:right;font-size:22px;">${d.emoji}</td>
        </tr></table>
        <p style="margin:18px 0 0;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:rgba(255,255,255,0.75);">${esc(d.label)} gift card</p>
        <p style="margin:2px 0 0;font-size:30px;font-weight:700;color:#ffffff;">${amountStr}</p>
      </td></tr>
    </table>`;
    await sendEmail({
      to: recipient,
      subject: subjectSafe(`${d.emoji} You’ve received a ${amountStr} DoyinMart gift card`),
      html: emailLayout(
        "You’ve got a gift card 🎁",
        `${cardFace}
         ${emailText("Use this code at checkout:")}
         ${emailKeyBox(code)}
         ${note}
         <div style="margin:22px 0;">${emailButton(`${SITE_URL}/`, "Start shopping")}</div>
         ${emailText("Enter the code in the “Gift card” field when you check out. You can use it across multiple orders until the balance runs out.")}`
      ),
    });
  }
  return code;
}

// ---- Admin ----
export async function adminListGiftCards(limit = 50): Promise<GiftCard[]> {
  if (!hasServiceRole) return [];
  const { data } = await createAdminClient()
    .from("gift_cards")
    .select(SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as GiftCard[]) ?? [];
}

export async function setGiftCardDisabled(id: string, disabled: boolean): Promise<void> {
  if (!hasServiceRole || !id) return;
  await createAdminClient()
    .from("gift_cards")
    .update({ status: disabled ? "disabled" : "active" })
    .eq("id", id);
}

/** A vendor's sales paid (in part) by gift card — settled by the platform, not Paystack. */
export async function vendorGiftCardStats(
  vendorId: string
): Promise<{ count: number; gift_card_minor: number }> {
  if (!hasServiceRole) return { count: 0, gift_card_minor: 0 };
  const { data } = await createAdminClient()
    .from("orders")
    .select("gift_card_minor")
    .eq("vendor_id", vendorId)
    .eq("status", "paid")
    .gt("gift_card_minor", 0);
  const rows = (data as { gift_card_minor: number }[]) ?? [];
  return {
    count: rows.length,
    gift_card_minor: rows.reduce((t, r) => t + (r.gift_card_minor || 0), 0),
  };
}

/** Outstanding liability = sum of balances on active cards (money the platform owes). */
export async function adminGiftCardLiability(): Promise<number> {
  if (!hasServiceRole) return 0;
  const { data } = await createAdminClient()
    .from("gift_cards")
    .select("balance_minor")
    .eq("status", "active");
  return ((data as { balance_minor: number }[]) ?? []).reduce((t, r) => t + (r.balance_minor || 0), 0);
}

/** Cards a person bought or received (for the account page). Masks the full code. */
export async function getGiftCardsForEmail(email: string): Promise<GiftCard[]> {
  // Reject anything with PostgREST filter-grammar chars (defense-in-depth).
  if (!hasServiceRole || !email || /[,()]/.test(email)) return [];
  const { data } = await createAdminClient()
    .from("gift_cards")
    .select(SELECT)
    .or(`purchaser_email.eq.${email},recipient_email.eq.${email}`)
    .order("created_at", { ascending: false });
  return (data as GiftCard[]) ?? [];
}
