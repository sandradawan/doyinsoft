import { Gift } from "lucide-react";
import { TopNav } from "@/components/top-nav";
import { BuyGiftForm, CheckBalanceForm } from "./buy-form";

export const metadata = {
  title: "Gift cards — DoyinMart",
  description: "Buy a DoyinMart gift card and let someone shop any store. Redeem at checkout.",
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
      <p className="text-[15px] text-ink-soft m-0 mb-6 max-w-xl">
        Give the gift of choice. A DoyinMart gift card works at checkout across any store — software,
        digital goods, fashion and more. Spend it over multiple orders until the balance runs out.
      </p>

      <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          <h2 className="text-[16px] font-medium m-0 mb-3">Buy a gift card</h2>
          <BuyGiftForm />
        </div>

        <aside>
          <h2 className="text-[16px] font-medium m-0 mb-3">Check a balance</h2>
          <CheckBalanceForm />

          <div className="mt-8 text-[13px] text-ink-soft leading-relaxed">
            <p className="font-medium text-ink mb-1">How it works</p>
            <ol className="list-decimal pl-4 space-y-1 m-0">
              <li>Buy a card and pay with Paystack.</li>
              <li>The code is emailed instantly.</li>
              <li>At checkout, enter it in the <span className="text-ink">Gift card</span> field.</li>
              <li>It covers part or all of the order — pay any remainder by card.</li>
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}
