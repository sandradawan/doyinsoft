import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { getOrderAmount, issueLicenseForOrder } from "@/lib/data";
import { verifyPaystackTransaction } from "@/lib/paystack";
import { reissueGiftCardFromReference } from "@/lib/giftcards";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY ?? "";

/**
 * Paystack webhook — the trusted source of truth that a payment succeeded.
 * Verifies the HMAC-SHA512 signature, then on charge.success mints the license
 * for the order (idempotent) so the buyer's download unlocks.
 *
 * Configure the URL in the Paystack dashboard:
 *   https://your-domain/api/webhooks/paystack
 */
export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-paystack-signature") ?? "";

  if (!PAYSTACK_SECRET) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }

  const expected = createHmac("sha512", PAYSTACK_SECRET).update(raw).digest("hex");
  if (!safeEqual(signature, expected)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let event: PaystackEvent;
  try {
    event = JSON.parse(raw) as PaystackEvent;
  } catch {
    return NextResponse.json({ error: "Bad payload." }, { status: 400 });
  }

  if (event.event === "charge.success") {
    const meta = event.data?.metadata;
    const orderId = meta?.order_id;
    const email = event.data?.customer?.email ?? "";
    const reference = event.data?.reference;

    // Gift-card purchase: issue a card for the amount actually paid (idempotent
    // on the reference, re-verified against Paystack). No order is involved.
    if (meta?.kind === "giftcard" && reference) {
      await reissueGiftCardFromReference(reference);
    } else if (orderId && reference) {
      // A valid signature only proves the body came from Paystack — it does NOT
      // prove the buyer paid. Re-verify with Paystack's API and require the paid
      // amount to cover the Paystack portion (order total minus any gift card).
      const [v, order] = await Promise.all([
        verifyPaystackTransaction(reference),
        getOrderAmount(orderId),
      ]);
      const due = order ? order.amount_minor - (order.gift_card_minor ?? 0) : 0;
      const paidEnough =
        v.ok && order != null && v.orderId === orderId && (v.amountMinor ?? 0) >= due;

      if (paidEnough) {
        await issueLicenseForOrder(orderId, email || v.email || "", reference);
      } else {
        console.warn(
          `[webhook] refused to issue order ${orderId}: paid=${v.amountMinor} expected>=${due} ok=${v.ok}`
        );
      }
    }
  }

  // Always 200 so Paystack doesn't retry once we've accepted the event.
  return NextResponse.json({ received: true });
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

interface PaystackEvent {
  event: string;
  data?: {
    reference?: string;
    customer?: { email?: string };
    metadata?: {
      order_id?: string;
      product_slug?: string | null;
      kind?: string;
      gift_currency?: string | null;
      gift_amount_minor?: number | null;
      recipient_email?: string | null;
      message?: string | null;
      purchaser_email?: string | null;
      design?: string | null;
    };
  };
}
