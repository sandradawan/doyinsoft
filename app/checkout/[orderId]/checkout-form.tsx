"use client";

import { useState, useTransition } from "react";
import { formatPrice } from "@/lib/format";
import type { Currency, Gateway, ProductType } from "@/lib/types";
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
  productType = "digital",
}: {
  orderId: string;
  productSlug: string | null;
  amountMinor: number;
  currency: Currency;
  productType?: ProductType;
}) {
  const [gateway, setGateway] = useState<Gateway>("paystack");
  const [email, setEmail] = useState("");
  const [shippingName, setShippingName] = useState("");
  const [shippingPhone, setShippingPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isPhysical = productType === "physical";
  const isService = productType === "service";
  const needsDetails = isPhysical || isService;
  const detailsValid = needsDetails
    ? shippingName.length > 0 && shippingPhone.length > 0 && (!isPhysical || shippingAddress.length > 0)
    : true;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await startCheckout({
        orderId,
        productSlug,
        gateway,
        email,
        amountMinor,
        currency,
        shippingName,
        shippingPhone,
        shippingAddress,
      });
      if (res?.error) setError(res.error);
    });
  }

  return (
    <form onSubmit={submit}>
      {error && (
        <p className="text-[12px] text-info bg-info-bg rounded-md px-3 py-2 mb-4">
          {error}
        </p>
      )}

      <label className="block text-[12px] font-medium m-0 mb-2">Email address</label>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="field w-full mb-4"
      />

      {needsDetails && (
        <>
          <p className="text-[12px] font-medium m-0 mb-2">
            {isPhysical ? "Delivery details" : "Your details"}
          </p>
          <input
            value={shippingName}
            onChange={(e) => setShippingName(e.target.value)}
            placeholder="Full name"
            className="field w-full mb-2"
          />
          <input
            value={shippingPhone}
            onChange={(e) => setShippingPhone(e.target.value)}
            placeholder="Phone (WhatsApp)"
            inputMode="tel"
            className="field w-full mb-2"
          />
          {isPhysical && (
            <textarea
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              placeholder="Delivery address"
              rows={2}
              className="field w-full mb-4 resize-y"
            />
          )}
          {isService && <div className="mb-2" />}
        </>
      )}

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
        disabled={pending || email.length === 0 || !detailsValid}
        className="btn-primary w-full py-[10px]"
      >
        {pending ? "Redirecting…" : `Pay ${formatPrice(amountMinor, currency)}`}
      </button>

      <p className="text-[11px] text-ink-faint text-center mt-[10px] mb-0">
        {productType === "digital"
          ? "License key delivered instantly after payment"
          : isPhysical
            ? "The seller ships to your address after payment"
            : "The seller will contact you to fulfil your order"}
      </p>
    </form>
  );
}
