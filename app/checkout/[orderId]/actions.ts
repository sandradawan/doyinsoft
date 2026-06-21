"use server";

import { redirect } from "next/navigation";
import { hasServiceRole } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrderById, getProductBySlug } from "@/lib/data";
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
export async function startCheckout(input: CheckoutInput) {
  let orderId = input.orderId;

  // Persist a real pending order via the service role (buyers aren't logged in,
  // so this trusted server action creates the order, not the anon client).
  if (hasServiceRole && orderId === "new" && input.productSlug) {
    const product = await getProductBySlug(input.productSlug);
    if (product) {
      const admin = createAdminClient();
      const { data } = await admin
        .from("orders")
        .insert({
          product_id: product.id,
          vendor_id: product.vendor.id,
          buyer_name: input.email.split("@")[0] || "Guest",
          buyer_initials: (input.email[0] ?? "G").toUpperCase(),
          amount_minor: input.amountMinor,
          currency: input.currency,
          status: "pending",
          gateway: input.gateway,
        })
        .select("id")
        .single();
      if (data?.id) orderId = data.id;
    }
  }

  // Paystack hosted checkout (only path that takes a real payment here).
  if (input.gateway === "paystack" && PAYSTACK_SECRET) {
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: input.email,
        amount: input.amountMinor, // already in kobo/cents
        currency: input.currency,
        callback_url: `${SITE_URL}/checkout/${orderId}/success`,
        metadata: { order_id: orderId, product_slug: input.productSlug },
      }),
    });
    const json = await res.json();
    const url = json?.data?.authorization_url as string | undefined;
    if (url) redirect(url);
  }

  // Fallback: mock confirmation so the demo always completes.
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
