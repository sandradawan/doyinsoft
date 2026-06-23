import Link from "next/link";
import { Check, X, BadgeCheck } from "lucide-react";
import { getCardByActivationToken } from "@/lib/giftcards";
import { formatPrice } from "@/lib/format";
import { LogoMark } from "@/components/logo";
import { activateCardAction } from "./actions";

export const metadata = { title: "Activate gift card — DoyinMart" };

export default async function ActivateGiftCardPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ done?: string; err?: string }>;
}) {
  const { token } = await params;
  const { done, err } = await searchParams;
  const card = await getCardByActivationToken(token);

  const amount = card ? formatPrice(card.initial_minor, "NGN") : "";

  return (
    <main className="max-w-[420px] mx-auto px-5 py-12">
      <div className="flex items-center gap-2 mb-6">
        <LogoMark size={28} />
        <span className="text-[18px] font-medium">
          Doyin<span className="text-brand">Mart</span>
        </span>
      </div>

      {err === "rate" && (
        <p className="text-[13px] text-info bg-info-bg rounded-md px-3 py-2 mb-4">
          Too many attempts — please wait a moment and try again.
        </p>
      )}

      {!card ? (
        <Panel icon={<X size={18} className="text-info" />} bg="bg-info-bg">
          <h1 className="text-[20px] font-medium m-0 mb-1">Activation link not recognised</h1>
          <p className="text-[14px] text-ink-soft m-0">
            Check you scanned the QR on a DoyinMart gift card. If it keeps failing, contact support.
          </p>
        </Panel>
      ) : card.status === "active" ? (
        <Panel icon={<BadgeCheck size={18} className="text-success" />} bg="bg-success-bg">
          <h1 className="text-[20px] font-medium m-0 mb-1">
            {done ? "Activated ✓" : "Already active"}
          </h1>
          <p className="text-[14px] text-ink-soft m-0">
            This <strong>{amount}</strong> gift card is ready to redeem. The buyer scratches the panel
            and enters the code at checkout.
          </p>
        </Panel>
      ) : card.status === "inactive" ? (
        <Panel icon={<Check size={18} className="text-brand" />} bg="bg-brand-tint">
          <h1 className="text-[20px] font-medium m-0 mb-1">Activate this gift card</h1>
          <p className="text-[14px] text-ink-soft m-0 mb-5">
            Tap below to activate the <strong>{amount}</strong> card. Do this when you sell it — the
            buyer can then scratch and redeem it.
          </p>
          <form action={activateCardAction}>
            <input type="hidden" name="token" value={token} />
            <button className="btn-primary w-full py-3 text-[15px]">Activate {amount} card</button>
          </form>
        </Panel>
      ) : (
        <Panel icon={<X size={18} className="text-ink-soft" />} bg="bg-muted">
          <h1 className="text-[20px] font-medium m-0 mb-1">Can’t activate</h1>
          <p className="text-[14px] text-ink-soft m-0">
            This card is <strong>{card.status}</strong> and can’t be activated.
          </p>
        </Panel>
      )}

      <div className="mt-6">
        <Link href="/" className="text-[13px] text-ink-soft no-underline hover:text-ink">
          ← DoyinMart store
        </Link>
      </div>
    </main>
  );
}

function Panel({ icon, bg, children }: { icon: React.ReactNode; bg: string; children: React.ReactNode }) {
  return (
    <div>
      <div className={`w-9 h-9 rounded-full ${bg} flex items-center justify-center mb-3`}>{icon}</div>
      {children}
    </div>
  );
}
