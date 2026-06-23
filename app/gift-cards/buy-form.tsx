"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Gift, Mail, User } from "lucide-react";
import { GIFT_DESIGNS, giftDesign, giftGradient } from "@/lib/gift-designs";
import { GiftCardVisual } from "@/components/gift-card-visual";
import { buyGiftCard, checkGiftBalance, type BuyGiftState } from "./actions";

const TIERS = [1000, 2000, 5000, 10000, 20000, 50000]; // naira

const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;

function BuyButton({ amount }: { amount: number }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || amount <= 0} className="btn-primary w-full py-3 text-[15px]">
      {pending ? "Redirecting…" : amount > 0 ? `Continue — ${naira(amount)}` : "Choose an amount"}
    </button>
  );
}

export function BuyGiftForm() {
  const [state, action] = useActionState<BuyGiftState, FormData>(buyGiftCard, {});
  const [designKey, setDesignKey] = useState("classic");
  const [amount, setAmount] = useState(5000);
  const [custom, setCustom] = useState("");
  const [delivery, setDelivery] = useState<"gift" | "self">("gift");

  const design = giftDesign(designKey);

  function pickDesign(key: string) {
    setDesignKey(key);
    const d = giftDesign(key);
    // Default to the middle suggested amount for the occasion.
    if (!custom) setAmount(d.suggested[1] ?? d.suggested[0] ?? amount);
  }
  function pickTier(n: number) {
    setAmount(n);
    setCustom("");
  }
  function onCustom(v: string) {
    setCustom(v);
    setAmount(Number(v) || 0);
  }

  return (
    <div className="grid gap-7 md:grid-cols-[300px_minmax(0,1fr)] items-start">
      {/* Live preview */}
      <div className="md:sticky md:top-5">
        <GiftCardVisual design={design} amountLabel={amount > 0 ? naira(amount) : "₦—"} />
        <p className="text-[12px] text-ink-faint text-center mt-3">
          Live preview — this is what they’ll receive.
        </p>
      </div>

      <form action={action} className="min-w-0">
        {state.error && (
          <p className="text-[13px] text-info bg-info-bg rounded-md px-3 py-2 mb-4">{state.error}</p>
        )}

        {/* Design gallery */}
        <label className="block text-[14px] font-medium mb-2">Choose a design</label>
        <div className="grid grid-cols-4 gap-2 mb-5">
          {GIFT_DESIGNS.map((d) => (
            <button
              type="button"
              key={d.key}
              onClick={() => pickDesign(d.key)}
              title={d.label}
              className={[
                "rounded-lg aspect-[1.6/1] flex items-center justify-center text-[20px] cursor-pointer transition-all",
                designKey === d.key ? "ring-2 ring-offset-2 ring-brand scale-[1.03]" : "opacity-90 hover:opacity-100",
              ].join(" ")}
              style={{ backgroundImage: giftGradient(d) }}
            >
              {d.emoji}
            </button>
          ))}
        </div>
        <input type="hidden" name="design" value={designKey} />

        {/* Amount */}
        <label className="block text-[14px] font-medium mb-2">Amount</label>
        <div className="grid grid-cols-3 gap-2 mb-2">
          {TIERS.map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => pickTier(t)}
              className={[
                "border rounded-md py-2.5 text-[14px] cursor-pointer transition-colors",
                amount === t && !custom
                  ? "border-brand bg-brand-tint text-brand font-semibold"
                  : "border-line text-ink-soft hover:text-ink hover:bg-muted",
              ].join(" ")}
            >
              {naira(t)}
            </button>
          ))}
        </div>
        <input
          value={custom}
          onChange={(e) => onCustom(e.target.value.replace(/[^0-9]/g, ""))}
          inputMode="numeric"
          placeholder="Or enter a custom amount (₦)"
          className="field w-full mb-5"
        />
        <input type="hidden" name="amount" value={amount} />

        {/* Delivery method */}
        <label className="block text-[14px] font-medium mb-2">How do you want to send it?</label>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            type="button"
            onClick={() => setDelivery("gift")}
            className={[
              "flex items-center gap-2 border rounded-md px-3 py-2.5 text-[14px] cursor-pointer",
              delivery === "gift" ? "border-brand bg-brand-tint text-brand" : "border-line text-ink-soft hover:text-ink",
            ].join(" ")}
          >
            <Mail size={16} /> Send as a gift
          </button>
          <button
            type="button"
            onClick={() => setDelivery("self")}
            className={[
              "flex items-center gap-2 border rounded-md px-3 py-2.5 text-[14px] cursor-pointer",
              delivery === "self" ? "border-brand bg-brand-tint text-brand" : "border-line text-ink-soft hover:text-ink",
            ].join(" ")}
          >
            <User size={16} /> Buy for myself
          </button>
        </div>

        <label className="block text-[13px] font-medium mb-2">Your email (receipt)</label>
        <input name="buyer_email" type="email" required placeholder="you@example.com" className="field w-full mb-3" />

        {delivery === "gift" && (
          <>
            <label className="block text-[13px] font-medium mb-2">Recipient email</label>
            <input
              name="recipient_email"
              type="email"
              required
              placeholder="friend@example.com"
              className="field w-full mb-3"
            />
            <label className="block text-[13px] font-medium mb-2">
              Message <span className="text-ink-faint font-normal">— optional</span>
            </label>
            <textarea
              name="message"
              rows={2}
              maxLength={200}
              placeholder="Happy birthday! 🎉"
              className="field w-full mb-4 resize-y"
            />
          </>
        )}
        {delivery === "self" && (
          <p className="text-[12px] text-ink-faint mb-4">
            We’ll email the code to you so you can share it however you like.
          </p>
        )}

        <BuyButton amount={amount} />
        <p className="text-[12px] text-ink-faint text-center mt-3 mb-0">
          Paid securely with Paystack · the code is emailed instantly after payment.
        </p>
      </form>
    </div>
  );
}

export function CheckBalanceForm() {
  const [state, action] = useActionState(checkGiftBalance, {});
  return (
    <div>
      <form action={action} className="flex gap-2">
        <input
          name="code"
          placeholder="GIFT-XXXX-XXXX-XXXX-XXXX"
          className="field flex-1 uppercase font-mono text-[12px]"
        />
        <button className="border border-line rounded-md px-4 text-[14px] text-ink-soft hover:text-ink cursor-pointer">
          Check
        </button>
      </form>
      {state.ok && (
        <p className="inline-flex items-center gap-1.5 text-[13px] text-success mt-2 mb-0">
          <Gift size={15} /> {state.label}
        </p>
      )}
      {state.error && <p className="text-[12px] text-info mt-2 mb-0">{state.error}</p>}
    </div>
  );
}
