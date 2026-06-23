"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Gift } from "lucide-react";
import { buyGiftCard, checkGiftBalance, type BuyGiftState } from "./actions";

const TIERS = [1000, 2000, 5000, 10000, 20000]; // naira

function naira(n: number) {
  return `₦${n.toLocaleString("en-NG")}`;
}

function BuyButton({ amount }: { amount: number }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || amount <= 0} className="btn-primary w-full py-3">
      {pending ? "Redirecting…" : amount > 0 ? `Buy ${naira(amount)} gift card` : "Choose an amount"}
    </button>
  );
}

export function BuyGiftForm() {
  const [state, action] = useActionState<BuyGiftState, FormData>(buyGiftCard, {});
  const [amount, setAmount] = useState(2000);
  const [custom, setCustom] = useState("");

  function pickTier(n: number) {
    setAmount(n);
    setCustom("");
  }
  function onCustom(v: string) {
    setCustom(v);
    setAmount(Number(v) || 0);
  }

  return (
    <form action={action} className="border border-line rounded-lg p-5 max-w-md">
      {state.error && (
        <p className="text-[13px] text-info bg-info-bg rounded-md px-3 py-2 mb-4">{state.error}</p>
      )}

      <label className="block text-[13px] font-medium mb-2">Amount</label>
      <div className="grid grid-cols-3 gap-2 mb-3">
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
        <input
          value={custom}
          onChange={(e) => onCustom(e.target.value.replace(/[^0-9]/g, ""))}
          inputMode="numeric"
          placeholder="Custom ₦"
          className="field text-center"
        />
      </div>
      <input type="hidden" name="amount" value={amount} />

      <label className="block text-[13px] font-medium mb-2">Your email (receipt)</label>
      <input name="buyer_email" type="email" required placeholder="you@example.com" className="field w-full mb-3" />

      <label className="block text-[13px] font-medium mb-2">
        Recipient email <span className="text-ink-faint font-normal">— optional, we’ll send them the code</span>
      </label>
      <input name="recipient_email" type="email" placeholder="friend@example.com" className="field w-full mb-3" />

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

      <BuyButton amount={amount} />
      <p className="text-[12px] text-ink-faint text-center mt-3 mb-0">
        The code is emailed instantly after payment. Leave the recipient blank to send it to yourself.
      </p>
    </form>
  );
}

export function CheckBalanceForm() {
  const [state, action] = useActionState(checkGiftBalance, {});
  return (
    <form action={action} className="flex gap-2 max-w-md">
      <input
        name="code"
        placeholder="GIFT-XXXX-XXXX-XXXX-XXXX"
        className="field flex-1 uppercase font-mono text-[13px]"
      />
      <button className="border border-line rounded-md px-4 text-[14px] text-ink-soft hover:text-ink cursor-pointer">
        Check
      </button>
      {state.ok && (
        <span className="inline-flex items-center gap-1.5 text-[13px] text-success px-1">
          <Gift size={15} /> {state.label}
        </span>
      )}
      {state.error && <span className="text-[12px] text-info px-1 self-center">{state.error}</span>}
    </form>
  );
}
