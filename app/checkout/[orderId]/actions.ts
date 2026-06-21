"use server";

import { redirect } from "next/navigation";
import { hasServiceRole } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrderById, getProductBySlug, getVendorSubaccountCode } from "@/lib/data";
import { toNgnCharge } from "@/lib/money";
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
  const chargeMinor = toNgnCharge(input.amountMinor, input.currency);
  const chargeCurrency: Currency = "NGN";

  const product = input.productSlug ? await getProductBySlug(input.productSlug) : null;

  // The vendor's Paystack subaccount → enables automatic commission split.
  const subaccountCode = product
    ? await getVendorSubaccountCode(product.vendor.id)
    : null;

  // Persist a real pending order via the service role (buyers aren't logged in,
  // so this trusted server action creates the order, not the anon client).
  if (hasServiceRole && orderId === "new" && product) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("orders")
      .insert({
        product_id: product.id,
        vendor_id: product.vendor.id,
        buyer_name: input.email.split("@")[0] || "Guest",
        buyer_initials: (input.email[0] ?? "G").toUpperCase(),
        amount_minor: chargeMinor,
        currency: chargeCurrency,
        status: "pending",
        gateway: input.gateway,
      })
      .select("id")
      .single();
    if (data?.id) orderId = data.id;
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
          amount: chargeMinor, // NGN kobo
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
