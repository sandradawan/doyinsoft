"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { hasServiceRole } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getOrderById,
  getProductBySlug,
  getVendorSubaccountCode,
  issueLicenseForOrder,
} from "@/lib/data";
import { toNgnCharge } from "@/lib/money";
import { getCurrentUser } from "@/lib/auth";
import { affiliateOwnedByUser, resolveAffiliateId } from "@/lib/affiliate";
import { validateCoupon, type CouponCheck } from "@/lib/coupons";
import { validateGiftCard, redeemGiftCard, type GiftCardCheck } from "@/lib/giftcards";
import { checkRateLimit, clientId } from "@/lib/ratelimit";
import type { Currency, Gateway } from "@/lib/types";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY ?? "";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

interface CheckoutInput {
  orderId: string;
  productSlug: string | null;
  gateway: Gateway;
  email: string;
  coupon?: string;
  giftCard?: string;
  shippingName?: string;
  shippingPhone?: string;
  shippingAddress?: string;
}

/**
 * Preview a coupon for the checkout UI. The charge is derived SERVER-SIDE from the
 * product price (never trusted from the client), and re-validated authoritatively
 * in startCheckout before any money moves. Lightly rate-limited to deter coupon
 * enumeration.
 */
export async function previewCoupon(
  code: string,
  productSlug: string | null
): Promise<CouponCheck> {
  if (!(await checkRateLimit(`coupon:${await clientId()}`, 12, 60_000))) {
    return { ok: false, error: "Too many attempts — please wait a moment and try again." };
  }
  const product = productSlug ? await getProductBySlug(productSlug) : null;
  if (!product) return { ok: false, error: "Unknown product." };
  const chargeMinor = toNgnCharge(product.price_minor, product.currency);
  return validateCoupon(code, { chargeMinor, productVendorId: product.vendor.id });
}

/** Preview a gift card's balance for the checkout UI (rate-limited). */
export async function previewGiftCard(code: string): Promise<GiftCardCheck> {
  if (!(await checkRateLimit(`gift:${await clientId()}`, 12, 60_000))) {
    return { ok: false, error: "Too many attempts — please wait a moment and try again." };
  }
  return validateGiftCard(code);
}

/**
 * Resolve or create the order, then hand off to the chosen gateway.
 * - Paystack: initializes a transaction and redirects to its hosted page.
 * - Other gateways or missing keys: falls back to the mock success page
 *   so the flow is demoable end-to-end without real credentials.
 */
export async function startCheckout(
  input: CheckoutInput
): Promise<{ error: string } | void> {
  let orderId = input.orderId;
  const chargeCurrency: Currency = "NGN";

  const product = input.productSlug ? await getProductBySlug(input.productSlug) : null;

  // AUTHORITATIVE price — always derived server-side from the product (or, for an
  // already-created order, from the stored amount). The client never supplies the
  // amount, so a tampered request can't undercharge. Paystack NG charges NGN.
  let chargeMinor: number;
  if (product) {
    chargeMinor = toNgnCharge(product.price_minor, product.currency);
  } else if (orderId !== "new") {
    const existing = await getOrderById(orderId);
    if (!existing) return { error: "Order not found." };
    chargeMinor = toNgnCharge(existing.amount_minor, existing.currency);
  } else {
    return { error: "Unknown product." };
  }

  // The vendor's Paystack subaccount → enables automatic commission split.
  const subaccountCode = product
    ? await getVendorSubaccountCode(product.vendor.id)
    : null;

  // Affiliate attribution from the ?ref cookie. Drop it when the buyer IS the
  // affiliate (logged-in self-referral) — even if they pay with another email.
  const refCode = (await cookies()).get("ref")?.value;
  const refAffiliateId = refCode ? await resolveAffiliateId(refCode) : null;
  const buyerUser = await getCurrentUser();
  const affiliateId =
    refAffiliateId && (await affiliateOwnedByUser(refAffiliateId, buyerUser?.id ?? null))
      ? null
      : refAffiliateId;

  // Physical/service products need fulfilment + buyer contact.
  const needsFulfilment = product ? product.product_type !== "digital" : false;

  // Apply a discount code (server-authoritative — never trust the client's number).
  let discountMinor = 0;
  let couponCode: string | null = null;
  let orderValue = chargeMinor; // the order's value after any discount (= amount_minor)
  if (input.coupon && product) {
    const check = await validateCoupon(input.coupon, {
      chargeMinor,
      productVendorId: product.vendor.id,
    });
    if (check.ok) {
      discountMinor = check.discountMinor ?? 0;
      orderValue = check.finalMinor ?? chargeMinor;
      couponCode = check.code ?? null;
    }
  }

  // Apply a gift card as a payment method (prepaid credit, not a discount). It
  // pays toward the order value; the rest goes to Paystack. The card is debited
  // atomically only once the order is paid (in issueLicenseForOrder/markOrderPaid).
  let giftCardCode: string | null = null;
  let giftCardMinor = 0;
  if (input.giftCard) {
    const gc = await validateGiftCard(input.giftCard);
    if (gc.ok) {
      giftCardCode = gc.code ?? null;
      giftCardMinor = Math.min(gc.balance_minor ?? 0, orderValue);
    }
  }
  const payNow = orderValue - giftCardMinor; // what Paystack must charge

  // Persist a real pending order via the service role (buyers aren't logged in,
  // so this trusted server action creates the order, not the anon client).
  if (hasServiceRole && orderId === "new" && product) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("orders")
      .insert({
        product_id: product.id,
        vendor_id: product.vendor.id,
        buyer_name: input.shippingName || input.email.split("@")[0] || "Guest",
        buyer_initials: (input.email[0] ?? "G").toUpperCase(),
        amount_minor: orderValue,
        currency: chargeCurrency,
        status: "pending",
        gateway: input.gateway,
        affiliate_id: affiliateId,
        buyer_email: input.email,
        coupon_code: couponCode,
        discount_minor: discountMinor,
        gift_card_code: giftCardCode,
        gift_card_minor: giftCardMinor,
        fulfilment_status: needsFulfilment ? "pending" : null,
        shipping_name: input.shippingName || null,
        shipping_phone: input.shippingPhone || null,
        shipping_address: input.shippingAddress || null,
      })
      .select("id")
      .single();
    if (data?.id) orderId = data.id;
  }

  // Nothing left to charge (free item, 100%-off code, or fully gift-card-paid):
  // issue directly and skip the gateway. For a gift-card-covered order we debit
  // FIRST (atomic) so two concurrent checkouts can't both get it free — if the
  // card no longer covers it, fail safe instead of releasing the goods.
  if (payNow <= 0) {
    if (hasServiceRole && orderId !== "new") {
      if (giftCardCode && giftCardMinor > 0) {
        const debited = await redeemGiftCard(giftCardCode, giftCardMinor, orderId);
        if (debited < giftCardMinor) {
          return { error: "That gift card no longer has enough balance. Please try again." };
        }
      }
      await issueLicenseForOrder(orderId, input.email);
    }
    redirect(`/checkout/${orderId}/success?email=${encodeURIComponent(input.email)}`);
  }

  // Paystack hosted checkout — the only path that takes a real payment.
  if (input.gateway === "paystack" && PAYSTACK_SECRET) {
    let url: string | undefined;
    let message = "";
    try {
      const res = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: input.email,
          amount: payNow, // NGN kobo (after discount code + gift card)
          currency: chargeCurrency,
          callback_url: `${SITE_URL}/checkout/${orderId}/success`,
          metadata: { order_id: orderId, product_slug: input.productSlug },
          // Split to the vendor's subaccount (platform keeps its commission %).
          ...(subaccountCode ? { subaccount: subaccountCode } : {}),
        }),
      });
      const json = await res.json();
      url = json?.data?.authorization_url as string | undefined;
      message = json?.message ?? "";
    } catch {
      message = "Could not reach Paystack. Check your network and try again.";
    }

    if (url) redirect(url); // success → go to Paystack's hosted page

    // Paystack rejected the request — surface why instead of a silent fallback.
    return {
      error:
        `Paystack couldn't start this payment: ${message || "unknown error"}. ` +
        `Most likely the secret key is wrong — it must be the SECRET key (sk_test_… or sk_live_…), ` +
        `set as PAYSTACK_SECRET_KEY in your deployment, then redeploy.`,
    };
  }

  // Non-Paystack gateway, or Paystack not configured: demo confirmation.
  redirect(`/checkout/${orderId}/success?email=${encodeURIComponent(input.email)}`);
}

export async function resolveCheckoutOrder(orderId: string, productSlug?: string) {
  if (orderId !== "new") {
    const order = await getOrderById(orderId);
    if (order) return order;
  }
  // Synthesize a pending order from the product being bought.
  const product = productSlug ? await getProductBySlug(productSlug) : null;
  if (!product) return null;
  return {
    id: "new",
    product: {
      id: product.id,
      name: product.name,
      slug: product.slug,
      price_minor: product.price_minor,
      currency: product.currency,
      product_type: product.product_type,
    },
    buyer_name: "",
    buyer_initials: "",
    amount_minor: product.price_minor,
    currency: product.currency,
    status: "pending" as const,
    gateway: "paystack" as const,
    created_at: "",
  };
}
