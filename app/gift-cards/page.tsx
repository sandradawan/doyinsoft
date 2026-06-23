import { Gift } from "lucide-react";
import { TopNav } from "@/components/top-nav";
import { BuyGiftForm, CheckBalanceForm } from "./buy-form";

export const metadata = {
  title: "Gift cards — DoyinMart",
  description: "Buy a beautiful DoyinMart gift card for any occasion. Redeem at checkout, any store.",
};

export default function GiftCardsPage() {
  return (
    <div className="max-w-5xl mx-auto px-5 py-6">
      <TopNav />

      <div className="flex items-center gap-2 mb-1">
        <span className="w-9 h-9 rounded-lg bg-brand-tint text-brand flex items-center justify-center">
          <Gift size={18} />
        </span>
        <h1 className="text-[26px] font-medium m-0">Gift cards</h1>
      </div>
      <p className="text-[15px] text-ink-soft m-0 mb-7 max-w-2xl">
        Give the gift of choice. Pick a design for the occasion, set any amount, and we’ll deliver a
        beautiful card by email. It works at checkout across any store and can be spent over multiple
        orders until the balance runs out.
      </p>

      <BuyGiftForm />

      {/* Check balance + how it works */}
      <div className="grid gap-8 md:grid-cols-2 mt-12 pt-8 border-t border-line">
        <div>
          <h2 className="text-[16px] font-medium m-0 mb-2">Check a balance</h2>
          <p className="text-[13px] text-ink-soft m-0 mb-3">Enter a code to see what’s left on it.</p>
          <CheckBalanceForm />
        </div>
        <div className="text-[13px] text-ink-soft leading-relaxed">
          <p className="font-medium text-ink mb-1">How it works</p>
          <ol className="list-decimal pl-4 space-y-1 m-0">
            <li>Choose a design and amount, then pay with Paystack.</li>
            <li>The code is emailed instantly — to your recipient or to you.</li>
            <li>At checkout, enter it in the <span className="text-ink">Gift card</span> field.</li>
            <li>It covers part or all of the order — pay any remainder by card.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
