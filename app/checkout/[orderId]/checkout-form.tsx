"use client";

import { useState, useTransition } from "react";
import { formatPrice } from "@/lib/format";
import type { Currency, Gateway } from "@/lib/types";
import { startCheckout } from "./actions";

const GATEWAYS: { value: Gateway; label: string }[] = [
  { value: "paystack", label: "Paystack" },
  { value: "flutterwave", label: "Flutterwave" },
  { value: "stripe", label: "Stripe (card, international)" },
];

export function CheckoutForm({
  orderId,
  productSlug,
  amountMinor,
  currency,
}: {
  orderId: string;
  productSlug: string | null;
  amountMinor: number;
  currency: Currency;
}) {
  const [gateway, setGateway] = useState<Gateway>("paystack");
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(() =>
      startCheckout({ orderId, productSlug, gateway, email, amountMinor, currency })
    );
  }

  return (
    <form onSubmit={submit}>
      {/* Email — required by the payment gateway to send the receipt + key. */}
      <label className="block text-[12px] font-medium m-0 mb-2">Email address</label>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="field w-full mb-4"
      />

      <p className="text-[12px] font-medium m-0 mb-2">Payment method</p>
      <div className="flex flex-col gap-2 mb-4">
        {GATEWAYS.map((g) => {
          const selected = gateway === g.value;
          return (
            <label
              key={g.value}
              className={[
                "flex items-center gap-2 border rounded-md px-[10px] py-2 text-[13px] cursor-pointer",
                selected ? "border-line-strong text-ink" : "border-line text-ink-soft",
              ].join(" ")}
            >
              <input
                type="radio"
                name="gw"
                checked={selected}
                onChange={() => setGateway(g.value)}
              />
              {g.label}
            </label>
          );
        })}
      </div>

      <button
        type="submit"
        disabled={pending || email.length === 0}
        className="btn-primary w-full py-[10px]"
      >
        {pending ? "Redirecting…" : `Pay ${formatPrice(amountMinor, currency)}`}
      </button>

      <p className="text-[11px] text-ink-faint text-center mt-[10px] mb-0">
        License key delivered instantly after payment
      </p>
    </form>
  );
}
