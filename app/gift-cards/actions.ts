"use server";

import { redirect } from "next/navigation";
import { GIFT_MIN_MINOR, GIFT_MAX_MINOR, validateGiftCard } from "@/lib/giftcards";
import { formatPrice } from "@/lib/format";
import { checkRateLimit, clientId } from "@/lib/ratelimit";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY ?? "";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface BuyGiftState {
  error?: string;
}

/**
 * Start a gift-card purchase: validate the amount server-side, then hand off to
 * Paystack. The card is ISSUED on the webhook / success page using the amount
 * actually paid (never trusts the client). Recipient/message ride in metadata.
 */
export async function buyGiftCard(
  _prev: BuyGiftState,
  formData: FormData
): Promise<BuyGiftState> {
  const amountNaira = Number(formData.get("amount") ?? 0);
  const amountMinor = Math.round(amountNaira * 100);
  const buyerEmail = String(formData.get("buyer_email") ?? "").trim();
  const recipientEmail = String(formData.get("recipient_email") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim().slice(0, 200);

  if (!EMAIL_RE.test(buyerEmail)) return { error: "Enter a valid email for your receipt." };
  if (recipientEmail && !EMAIL_RE.test(recipientEmail))
    return { error: "The recipient email looks invalid." };
  if (!Number.isFinite(amountMinor) || amountMinor < GIFT_MIN_MINOR || amountMinor > GIFT_MAX_MINOR) {
    return {
      error: `Choose an amount between ${formatPrice(GIFT_MIN_MINOR, "NGN")} and ${formatPrice(GIFT_MAX_MINOR, "NGN")}.`,
    };
  }

  if (!PAYSTACK_SECRET) {
    return { error: "Payments aren’t configured yet. Add your Paystack key to buy gift cards." };
  }

  let url: string | undefined;
  let message_ = "";
  try {
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: buyerEmail,
        amount: amountMinor,
        currency: "NGN",
        callback_url: `${SITE_URL}/gift-cards/success`,
        metadata: {
          kind: "giftcard",
          recipient_email: recipientEmail || null,
          message: message || null,
          purchaser_email: buyerEmail,
        },
      }),
    });
    const json = await res.json();
    url = json?.data?.authorization_url as string | undefined;
    message_ = json?.message ?? "";
  } catch {
    return { error: "Could not reach Paystack. Check your network and try again." };
  }

  if (url) redirect(url);
  return { error: `Paystack couldn’t start this purchase: ${message_ || "unknown error"}.` };
}

/** Look up a gift card's remaining balance (rate-limited; generic errors). */
export async function checkGiftBalance(
  _prev: { ok?: boolean; label?: string; error?: string },
  formData: FormData
): Promise<{ ok?: boolean; label?: string; error?: string }> {
  if (!(await checkRateLimit(`gift-balance:${await clientId()}`, 10, 60_000))) {
    return { error: "Too many checks — please wait a moment and try again." };
  }
  const code = String(formData.get("code") ?? "");
  const res = await validateGiftCard(code);
  if (!res.ok) return { error: res.error };
  return { ok: true, label: `Balance: ${formatPrice(res.balance_minor ?? 0, "NGN")}` };
}
