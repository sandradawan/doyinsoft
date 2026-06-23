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
import { getSettings } from "@/lib/settings";
import { resolveAffiliateId } from "@/lib/affiliate";
import { validateCoupon, type CouponCheck } from "@/lib/coupons";
import type { Currency, Gateway } from "@/lib/types";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY ?? "";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

interface CheckoutInput {
  orderId: string;
  productSlug: string | null;
  gateway: Gateway;
  email: string;
  amountMinor: number;
  currency: Currency;
  coupon?: string;
  shippingName?: string;
  shippingPhone?: string;
  shippingAddress?: string;
}

/**
 * Preview a coupon for the checkout UI. The charge passed here is already NGN
 * (the page converts USD before rendering the form). Re-validated authoritatively
 * in startCheckout before any money moves.
 */
export async function previewCoupon(
  code: string,
  productSlug: string | null,
  chargeMinor: number
): Promise<CouponCheck> {
  const product = productSlug ? await getProductBySlug(productSlug) : null;
  return validateCoupon(code, { chargeMinor, productVendorId: product?.vendor.id ?? null });
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

  // Always charge NGN (Paystack NG accounts can't take USD). Convert if needed.
  const { usd_to_ngn } = await getSettings();
  const chargeMinor =
    input.currency === "USD" ? Math.round(input.amountMinor * usd_to_ngn) : input.amountMinor;
  const chargeCurrency: Currency = "NGN";

  const product = input.productSlug ? await getProductBySlug(input.productSlug) : null;

  // The vendor's Paystack subaccount → enables automatic commission split.
  const subaccountCode = product
    ? await getVendorSubaccountCode(product.vendor.id)
    : null;

  // Affiliate attribution from the ?ref cookie.
  const refCode = (await cookies()).get("ref")?.value;
  const affiliateId = refCode ? await resolveAffiliateId(refCode) : null;

  // Physical/service products need fulfilment + buyer contact.
  const needsFulfilment = product ? product.product_type !== "digital" : false;

  // Apply a discount code (server-authoritative — never trust the client's number).
  let discountMinor = 0;
  let couponCode: string | null = null;
  let finalCharge = chargeMinor;
  if (input.coupon && product) {
    const check = await validateCoupon(input.coupon, {
      chargeMinor,
      productVendorId: product.vendor.id,
    });
    if (check.ok) {
      discountMinor = check.discountMinor ?? 0;
      finalCharge = check.finalMinor ?? chargeMinor;
      couponCode = check.code ?? null;
    }
  }

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
        amount_minor: finalCharge,
        currency: chargeCurrency,
        status: "pending",
        gateway: input.gateway,
        affiliate_id: affiliateId,
        buyer_email: input.email,
        coupon_code: couponCode,
        discount_minor: discountMinor,
        fulfilment_status: needsFulfilment ? "pending" : null,
        shipping_name: input.shippingName || null,
        shipping_phone: input.shippingPhone || null,
        shipping_address: input.shippingAddress || null,
      })
      .select("id")
      .single();
    if (data?.id) orderId = data.id;
  }

  // Fully discounted (e.g. 100%-off code, or a free item): no payment needed —
  // issue the licence + receipt directly and skip the gateway.
  if (finalCharge <= 0) {
    if (hasServiceRole && orderId !== "new") {
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
          amount: finalCharge, // NGN kobo (after any discount code)
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
