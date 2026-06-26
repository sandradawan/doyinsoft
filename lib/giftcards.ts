import "server-only";
import { randomBytes } from "crypto";
import { createAdminClient } from "./supabase/admin";
import { hasServiceRole } from "./supabase/env";
import { sendEmail, emailLayout, emailText, emailKeyBox, emailButton, esc, subjectSafe } from "./email";
import { formatPrice } from "./format";
import { giftDesign, giftGradient } from "./gift-designs";
import { toNgnCharge } from "./money";
import { PLATFORM_COMMISSION_PERCENT, verifyPaystackPayment } from "./paystack";
import { notify } from "./notifications";
import type { Currency } from "./types";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Purchase bounds per currency (minor units). NGN: ₦1,000 → ₦10m. USD: $2 → $1,000.
export const GIFT_BOUNDS: Record<Currency, { min: number; max: number }> = {
  NGN: { min: 100_000, max: 1_000_000_000 },
  USD: { min: 200, max: 100_000 },
};

export type GiftCardStatus = "active" | "depleted" | "disabled" | "expired" | "inactive";

export interface GiftCard {
  id: string;
  code: string;
  vendor_id: string | null;
  initial_minor: number;
  balance_minor: number;
  currency: "NGN" | "USD";
  status: GiftCardStatus;
  recipient_email: string | null;
  design: string;
  batch_ref: string | null;
  activation_token?: string | null;
  expires_at: string | null;
  created_at: string;
}

const SELECT =
  "id, code, vendor_id, initial_minor, balance_minor, currency, status, recipient_email, design, batch_ref, expires_at, created_at";
const BATCH_SELECT = `${SELECT}, activation_token`;

/** A fresh, unguessable code: GIFT-XXXX-XXXX-XXXX-XXXX (hex, uppercase). */
export function generateGiftCardCode(): string {
  const seg = () => randomBytes(2).toString("hex").toUpperCase();
  return `GIFT-${seg()}-${seg()}-${seg()}-${seg()}`;
}

/** URL-safe per-card activation token (separate secret from the redeem code). */
export function generateActivationToken(): string {
  return randomBytes(12).toString("base64url"); // 96-bit, ~16 chars
}

export interface GiftCardCheck {
  ok: boolean;
  error?: string;
  code?: string;
  balance_minor?: number;
  currency?: Currency;
  /** The card's spending value in NGN (USD converted at the current rate). */
  balance_ngn_minor?: number;
}

/** Validate a code for redemption/balance display. Server-authoritative. */
export async function validateGiftCard(rawCode: string): Promise<GiftCardCheck> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: "Enter a gift card code." };
  if (!hasServiceRole) return { ok: false, error: "Gift cards are unavailable right now." };

  const { data } = await createAdminClient().from("gift_cards").select(SELECT).eq("code", code).maybeSingle();
  const c = data as GiftCard | null;
  // Only 'active' cards are redeemable. 'inactive' (printed, not yet sold/activated),
  // 'disabled' and 'expired' are not. Generic error to deter enumeration.
  if (!c || c.status !== "active") return { ok: false, error: "This gift card code isn’t valid." };
  if (c.balance_minor <= 0) return { ok: false, error: "This gift card has no balance left." };
  if (c.expires_at && new Date(c.expires_at).getTime() < Date.now())
    return { ok: false, error: "This gift card has expired." };
  return {
    ok: true,
    code: c.code,
    balance_minor: c.balance_minor,
    currency: c.currency,
    balance_ngn_minor: toNgnCharge(c.balance_minor, c.currency),
  };
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
  /** NGN actually paid via Paystack (for the security check). */
  paidNgnMinor: number;
  /** Card denomination. */
  currency: Currency;
  /** Card face value, in `currency` minor units. */
  amountMinor: number;
  purchaserEmail?: string;
  recipientEmail?: string;
  message?: string;
  design?: string;
}): Promise<string | null> {
  if (!hasServiceRole || !opts.reference || opts.amountMinor <= 0) return null;

  // Security: the NGN paid must cover this card's value at the current rate.
  // (Card amount/currency ride in our own server-set Paystack metadata, and this
  // re-checks the verified paid amount — so an under-payment can't mint a card.)
  const expectedNgn = toNgnCharge(opts.amountMinor, opts.currency);
  if (opts.paidNgnMinor + 1 < expectedNgn) {
    console.warn(
      `[giftcard] underpaid for ${opts.reference}: paidNgn=${opts.paidNgnMinor} expected>=${expectedNgn} (${opts.amountMinor} ${opts.currency})`
    );
    return null;
  }

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
        currency: opts.currency,
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
    console.error(`[giftcard] insert failed for ${opts.reference}:`, error?.message ?? error);
    return null;
  }

  const amountStr = formatPrice(opts.amountMinor, opts.currency);
  const buyer = (opts.purchaserEmail || "").trim();
  const isGift = !!recipient && buyer.toLowerCase() !== recipient.toLowerCase();

  // Buyer receipt — always confirm the purchase to the person who paid. When the
  // card was sent to someone else, the receipt confirms the gift (without the
  // code, which belongs to the recipient); otherwise the card email below is
  // their receipt, so we don't double-send. Best-effort: never block the card.
  if (buyer && isGift) {
    try {
      await sendEmail({
        to: buyer,
        subject: subjectSafe(`Your DoyinMart gift card purchase — ${amountStr}`),
        html: emailLayout(
          "Thanks for your purchase 🎁",
          `${emailText(`Your <strong>${amountStr}</strong> gift card has been issued and emailed to <strong>${esc(recipient)}</strong>.`)}
           ${emailText(`Payment reference: <strong>${esc(opts.reference)}</strong>`)}
           <div style="margin:22px 0;">${emailButton(`${SITE_URL}/account`, "View in your account")}</div>
           ${emailText("The recipient can redeem it at checkout. You can see the card and its balance any time in your account.")}`
        ),
      });
    } catch (e) {
      console.error(`[giftcard] buyer receipt failed for ${opts.reference}:`, e);
    }
  }

  if (recipient) {
    const d = giftDesign(opts.design);
    await notify({
      email: recipient,
      type: "gift",
      title: `You received a ${amountStr} gift card 🎁`,
      body: `Code ${code} — use it at checkout.`,
      link: "/gift-cards",
    });
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

export interface ReissueResult {
  /** Paystack confirmed this reference as a successful payment. */
  paymentSucceeded: boolean;
  /** The issued (or already-issued) gift-card code, or null if not issued. */
  code: string | null;
  amountMinor: number;
  currency: Currency;
  design: string;
  error?: string;
}

/**
 * Verify a Paystack reference and issue (idempotently) the gift card it paid for.
 * The single source of truth shared by the success page, the webhook and the
 * admin "re-issue by reference" tool — so all three behave identically.
 */
export async function reissueGiftCardFromReference(reference: string): Promise<ReissueResult> {
  const base: ReissueResult = { paymentSucceeded: false, code: null, amountMinor: 0, currency: "NGN", design: "classic" };
  const ref = (reference || "").trim();
  if (!ref) return { ...base, error: "Enter a payment reference." };

  const v = await verifyPaystackPayment(ref);
  if (!v.ok) {
    return { ...base, error: "Paystack hasn’t confirmed this reference as a successful payment." };
  }
  if (v.metadata?.kind !== "giftcard") {
    console.warn(`[giftcard-reissue] ${ref} is not a gift-card purchase (kind=${v.metadata?.kind ?? "none"})`);
    return { ...base, paymentSucceeded: true, error: "This reference isn’t a gift-card purchase." };
  }

  const currency = (v.metadata?.gift_currency as Currency) || "NGN";
  const amountMinor = Number(v.metadata?.gift_amount_minor ?? v.amountMinor ?? 0);
  const design = (v.metadata?.design as string) || "classic";
  const code = await issueGiftCardFromPayment({
    reference: ref,
    paidNgnMinor: v.amountMinor ?? 0,
    currency,
    amountMinor,
    purchaserEmail: (v.metadata?.purchaser_email as string) || v.email,
    recipientEmail: (v.metadata?.recipient_email as string) || undefined,
    message: (v.metadata?.message as string) || undefined,
    design,
  });
  if (!code) console.error(`[giftcard-reissue] verified but issuance returned null for ${ref}`);
  return {
    paymentSucceeded: true,
    code,
    amountMinor,
    currency,
    design,
    error: code ? undefined : "Payment verified, but the card couldn’t be issued — check the server logs.",
  };
}

// ---- Physical / batch ----

export const GIFT_BATCH_MAX = 200;

/**
 * Create a batch of printable gift cards in one go (for physical distribution).
 * Cards can be created "inactive" (printed, activate on sale) or "active".
 * Returns the batch ref and the created cards.
 */
export async function batchCreateGiftCards(opts: {
  count: number;
  amountMinor: number;
  design?: string;
  active: boolean;
  expiresAt?: string | null;
}): Promise<{ batchRef: string; cards: GiftCard[] } | { error: string }> {
  if (!hasServiceRole) return { error: "Gift cards need a configured database." };
  const count = Math.floor(opts.count);
  if (!Number.isFinite(count) || count < 1 || count > GIFT_BATCH_MAX)
    return { error: `Quantity must be between 1 and ${GIFT_BATCH_MAX}.` };
  if (!Number.isFinite(opts.amountMinor) || opts.amountMinor < GIFT_BOUNDS.NGN.min || opts.amountMinor > GIFT_BOUNDS.NGN.max)
    return { error: "Amount is out of range." };

  const batchRef = `batch_${randomBytes(5).toString("hex")}`;
  const design = giftDesign(opts.design).key;
  const rows = Array.from({ length: count }, () => ({
    code: generateGiftCardCode(),
    activation_token: generateActivationToken(),
    initial_minor: opts.amountMinor,
    balance_minor: opts.amountMinor,
    currency: "NGN" as const,
    status: opts.active ? "active" : "inactive",
    design,
    batch_ref: batchRef,
    expires_at: opts.expiresAt ?? null,
  }));

  const { data, error } = await createAdminClient().from("gift_cards").insert(rows).select(BATCH_SELECT);
  if (error) return { error: error.message };
  return { batchRef, cards: (data as GiftCard[]) ?? [] };
}

/** Activate a printed (inactive) card — e.g. when a store sells it. */
export async function activateGiftCard(id: string): Promise<void> {
  if (!hasServiceRole || !id) return;
  await createAdminClient().from("gift_cards").update({ status: "active" }).eq("id", id).eq("status", "inactive");
}

/** Look up a card by its activation token (for the store activation page). */
export async function getCardByActivationToken(
  token: string
): Promise<{ initial_minor: number; status: GiftCardStatus } | null> {
  if (!hasServiceRole || !token) return null;
  const { data } = await createAdminClient()
    .from("gift_cards")
    .select("initial_minor, status")
    .eq("activation_token", token)
    .maybeSingle();
  return (data as { initial_minor: number; status: GiftCardStatus }) ?? null;
}

/**
 * Activate a card by its token (store scans the QR). Idempotent. Activation alone
 * is harmless — the card is only redeemable once someone also has the sealed code.
 */
export async function activateByToken(
  token: string
): Promise<{ ok: boolean; alreadyActive?: boolean; amount_minor?: number; error?: string }> {
  if (!hasServiceRole || !token) return { ok: false, error: "Invalid activation link." };
  const card = await getCardByActivationToken(token);
  if (!card) return { ok: false, error: "This activation code isn’t recognised." };
  if (card.status === "active") return { ok: true, alreadyActive: true, amount_minor: card.initial_minor };
  if (card.status !== "inactive")
    return { ok: false, error: `This card can’t be activated (status: ${card.status}).` };
  await createAdminClient()
    .from("gift_cards")
    .update({ status: "active" })
    .eq("activation_token", token)
    .eq("status", "inactive");
  return { ok: true, amount_minor: card.initial_minor };
}

/** Recent print runs (grouped by batch_ref) so they can be re-printed. */
export async function adminListBatches(): Promise<
  { batch_ref: string; count: number; amount_minor: number; active: number; created_at: string }[]
> {
  if (!hasServiceRole) return [];
  const { data } = await createAdminClient()
    .from("gift_cards")
    .select("batch_ref, initial_minor, status, created_at")
    .not("batch_ref", "is", null)
    .order("created_at", { ascending: false })
    .limit(1000);
  const rows =
    (data as { batch_ref: string; initial_minor: number; status: string; created_at: string }[]) ?? [];
  const map = new Map<string, { count: number; amount_minor: number; active: number; created_at: string }>();
  for (const r of rows) {
    const e = map.get(r.batch_ref) ?? { count: 0, amount_minor: r.initial_minor, active: 0, created_at: r.created_at };
    e.count++;
    if (r.status === "active") e.active++;
    if (r.created_at < e.created_at) e.created_at = r.created_at;
    map.set(r.batch_ref, e);
  }
  return [...map.entries()]
    .map(([batch_ref, e]) => ({ batch_ref, ...e }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function listGiftCardsByBatch(batchRef: string): Promise<GiftCard[]> {
  if (!hasServiceRole || !batchRef) return [];
  const { data } = await createAdminClient()
    .from("gift_cards")
    .select(BATCH_SELECT)
    .eq("batch_ref", batchRef)
    .order("created_at", { ascending: true });
  return (data as GiftCard[]) ?? [];
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
    .select("balance_minor, currency")
    .eq("status", "active");
  // Convert each card's balance to NGN so the total is meaningful across currencies.
  return ((data as { balance_minor: number; currency: Currency }[]) ?? []).reduce(
    (t, r) => t + toNgnCharge(r.balance_minor || 0, r.currency),
    0
  );
}

/**
 * Total gift-card value already spent at stores (sum of gift_card_minor on paid
 * orders). This is the platform's settlement obligation to vendors — it collected
 * the cash at card-purchase time, and Paystack's split only routed the
 * card-charged remainder, so this amount is owed to vendors out of the float.
 */
export async function adminGiftCardRedeemed(): Promise<number> {
  if (!hasServiceRole) return 0;
  const { data } = await createAdminClient()
    .from("orders")
    .select("gift_card_minor")
    .eq("status", "paid")
    .gt("gift_card_minor", 0);
  return ((data as { gift_card_minor: number }[]) ?? []).reduce((t, r) => t + (r.gift_card_minor || 0), 0);
}

/**
 * Per-vendor settlement owed from gift-card spend. Paystack's split only routes the
 * card-charged portion to vendors, so the platform owes each vendor their
 * (100 − commission)% share of the gift-card-funded part of their paid sales.
 */
export async function adminGiftCardVendorOwed(): Promise<
  { vendor: string; gross_minor: number; owed_minor: number }[]
> {
  if (!hasServiceRole) return [];
  const { data } = await createAdminClient()
    .from("orders")
    .select("gift_card_minor, vendor:vendors(name)")
    .eq("status", "paid")
    .gt("gift_card_minor", 0);
  const rows =
    (data as { gift_card_minor: number; vendor: { name?: string } | { name?: string }[] | null }[]) ?? [];

  const byVendor = new Map<string, number>();
  for (const r of rows) {
    const v = Array.isArray(r.vendor) ? r.vendor[0] : r.vendor;
    const name = v?.name ?? "Unknown vendor";
    byVendor.set(name, (byVendor.get(name) ?? 0) + (r.gift_card_minor || 0));
  }
  const share = (100 - PLATFORM_COMMISSION_PERCENT) / 100;
  return [...byVendor.entries()]
    .map(([vendor, gross]) => ({ vendor, gross_minor: gross, owed_minor: Math.round(gross * share) }))
    .sort((a, b) => b.owed_minor - a.owed_minor);
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
