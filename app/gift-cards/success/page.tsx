import Link from "next/link";
import { X } from "lucide-react";
import { verifyPaystackPayment, isPaystackConfigured } from "@/lib/paystack";
import { issueGiftCardFromPayment } from "@/lib/giftcards";
import { giftDesign } from "@/lib/gift-designs";
import { GiftCardVisual } from "@/components/gift-card-visual";
import { formatPrice } from "@/lib/format";

export const metadata = { title: "Gift card — DoyinMart" };

export default async function GiftCardSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string; trxref?: string }>;
}) {
  const { reference, trxref } = await searchParams;
  const ref = reference || trxref;

  let code: string | null = null;
  let amountMinor = 0;
  let currency: "NGN" | "USD" = "NGN";
  let designKey = "classic";
  let paymentSucceeded = false; // verified by Paystack, even if issuance lags
  if (isPaystackConfigured && ref) {
    const v = await verifyPaystackPayment(ref);
    paymentSucceeded = v.ok;
    if (v.ok && v.metadata?.kind === "giftcard") {
      currency = (v.metadata?.gift_currency as "NGN" | "USD") || "NGN";
      amountMinor = Number(v.metadata?.gift_amount_minor ?? v.amountMinor ?? 0); // card value
      designKey = (v.metadata?.design as string) || "classic";
      // Issue the card (idempotent on the reference; verifies the NGN paid covers it).
      code = await issueGiftCardFromPayment({
        reference: ref,
        paidNgnMinor: v.amountMinor ?? 0,
        currency,
        amountMinor,
        purchaserEmail: (v.metadata?.purchaser_email as string) || v.email,
        recipientEmail: (v.metadata?.recipient_email as string) || undefined,
        message: (v.metadata?.message as string) || undefined,
        design: designKey,
      });
      if (!code) console.error(`[giftcard-success] verified but issuance returned null for ${ref}`);
    } else {
      // Most common real cause: the transaction isn't 'success' (abandoned / declined),
      // or the secret key mode (test/live) doesn't match the one that started it.
      console.warn(`[giftcard-success] not issued for ${ref}: paystackOk=${v.ok} kind=${v.metadata?.kind ?? "(none)"}`);
    }
  }

  if (!code) {
    return (
      <main className="max-w-[460px] mx-auto px-5 py-10">
        <div className="w-9 h-9 rounded-full bg-info-bg flex items-center justify-center mb-3">
          <X size={17} className="text-info" />
        </div>
        <h1 className="text-[22px] font-medium m-0 mb-1">
          {paymentSucceeded ? "Almost there — finalising your card" : "We couldn’t confirm this purchase"}
        </h1>
        <p className="text-[14px] text-ink-soft m-0 mb-5">
          {paymentSucceeded
            ? "Your payment went through. Your gift-card code is being issued and will be emailed in a moment — you can safely refresh this page."
            : "If you completed payment, your gift-card code will still be emailed once it confirms. If you weren’t charged, no card was issued. Contact support with your payment reference if a charge doesn’t arrive."}
        </p>
        {ref ? <p className="text-[12px] text-ink-faint m-0 mb-5">Reference: {ref}</p> : null}
        <Link href="/gift-cards" className="text-[14px] text-ink-soft no-underline hover:text-ink">
          ← Back to gift cards
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-[460px] mx-auto px-5 py-10">
      <h1 className="text-[22px] font-medium m-0 mb-1">Gift card ready 🎁</h1>
      <p className="text-[14px] text-ink-soft m-0 mb-5">
        Your {formatPrice(amountMinor, currency)} gift card has been issued and emailed. Here it is:
      </p>

      <div className="max-w-[320px] mb-5">
        <GiftCardVisual design={giftDesign(designKey)} amountLabel={formatPrice(amountMinor, currency)} code={code} />
      </div>

      <p className="text-[13px] text-ink-faint mb-6">
        Enter this code in the <span className="text-ink-soft">Gift card</span> field at checkout. It
        works across multiple orders until the balance is used up.
      </p>

      <Link href="/" className="btn-primary inline-block px-5 py-2.5 no-underline">
        Start shopping
      </Link>
    </main>
  );
}
