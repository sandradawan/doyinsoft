import Link from "next/link";
import { Gift, X } from "lucide-react";
import { verifyPaystackPayment, isPaystackConfigured } from "@/lib/paystack";
import { issueGiftCardFromPayment } from "@/lib/giftcards";
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
  if (isPaystackConfigured && ref) {
    const v = await verifyPaystackPayment(ref);
    if (v.ok && v.metadata?.kind === "giftcard") {
      amountMinor = v.amountMinor ?? 0;
      // Issue using the amount ACTUALLY paid (idempotent on the reference).
      code = await issueGiftCardFromPayment({
        reference: ref,
        amountMinor,
        purchaserEmail: (v.metadata?.purchaser_email as string) || v.email,
        recipientEmail: (v.metadata?.recipient_email as string) || undefined,
        message: (v.metadata?.message as string) || undefined,
      });
    }
  }

  if (!code) {
    return (
      <main className="max-w-[460px] mx-auto px-5 py-10">
        <div className="w-9 h-9 rounded-full bg-info-bg flex items-center justify-center mb-3">
          <X size={17} className="text-info" />
        </div>
        <h1 className="text-[22px] font-medium m-0 mb-1">We couldn’t confirm this purchase</h1>
        <p className="text-[14px] text-ink-soft m-0 mb-5">
          If you were charged, your gift-card code will still be emailed once the payment confirms.
          Contact support with your payment reference if it doesn’t arrive.
        </p>
        <Link href="/gift-cards" className="text-[14px] text-ink-soft no-underline hover:text-ink">
          ← Back to gift cards
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-[460px] mx-auto px-5 py-10">
      <div className="w-9 h-9 rounded-full bg-success-bg flex items-center justify-center mb-3">
        <Gift size={17} className="text-success" />
      </div>
      <h1 className="text-[22px] font-medium m-0 mb-1">Gift card ready 🎁</h1>
      <p className="text-[14px] text-ink-soft m-0 mb-5">
        Your {formatPrice(amountMinor, "NGN")} gift card has been issued and emailed. Here’s the code:
      </p>

      <div className="border border-line rounded-md p-4 bg-muted text-center font-mono text-[18px] font-semibold tracking-wide mb-5 break-all">
        {code}
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
