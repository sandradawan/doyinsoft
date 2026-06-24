"use client";

import { useState, useTransition } from "react";
import { formatPrice } from "@/lib/format";
import type { Currency, Gateway, ProductType } from "@/lib/types";
import { previewCoupon, previewGiftCard, startCheckout } from "./actions";

interface AppliedCoupon {
  code: string;
  label: string;
  discountMinor: number;
  finalMinor: number;
}

interface AppliedGift {
  code: string;
  balanceMinor: number; // in the card's currency
  balanceNgn: number; // spending value in NGN
  currency: Currency;
}

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

  // Discount code
  const [couponInput, setCouponInput] = useState("");
  const [applied, setApplied] = useState<AppliedCoupon | null>(null);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [couponPending, startCoupon] = useTransition();

  // Gift card (a payment method, applied after any discount)
  const [giftInput, setGiftInput] = useState("");
  const [gift, setGift] = useState<AppliedGift | null>(null);
  const [giftMsg, setGiftMsg] = useState<string | null>(null);
  const [giftPending, startGift] = useTransition();

  const orderValue = applied ? applied.finalMinor : amountMinor; // after discount
  const giftMinor = gift ? Math.min(gift.balanceNgn, orderValue) : 0;
  const payMinor = orderValue - giftMinor;

  function applyCoupon() {
    const code = couponInput.trim();
    if (!code) return;
    setCouponMsg(null);
    startCoupon(async () => {
      const res = await previewCoupon(code, productSlug);
      if (res.ok) {
        setApplied({
          code: res.code!,
          label: res.label ?? "Discount",
          discountMinor: res.discountMinor ?? 0,
          finalMinor: res.finalMinor ?? amountMinor,
        });
        setCouponMsg(null);
      } else {
        setApplied(null);
        setCouponMsg(res.error ?? "That code isn’t valid.");
      }
    });
  }

  function removeCoupon() {
    setApplied(null);
    setCouponInput("");
    setCouponMsg(null);
  }

  function applyGift() {
    const code = giftInput.trim();
    if (!code) return;
    setGiftMsg(null);
    startGift(async () => {
      const res = await previewGiftCard(code);
      if (res.ok) {
        setGift({
          code: res.code!,
          balanceMinor: res.balance_minor ?? 0,
          balanceNgn: res.balance_ngn_minor ?? res.balance_minor ?? 0,
          currency: res.currency ?? "NGN",
        });
        setGiftMsg(null);
      } else {
        setGift(null);
        setGiftMsg(res.error ?? "That gift card isn’t valid.");
      }
    });
  }

  function removeGift() {
    setGift(null);
    setGiftInput("");
    setGiftMsg(null);
  }

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
        coupon: applied?.code,
        giftCard: gift?.code,
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

      {/* Discount code */}
      <p className="text-[12px] font-medium m-0 mb-2">Discount code</p>
      {applied ? (
        <div className="flex items-center justify-between border border-brand/40 bg-brand-tint rounded-md px-[10px] py-2 mb-2 text-[13px]">
          <span className="text-brand font-medium">
            {applied.code} — {applied.label}
          </span>
          <button
            type="button"
            onClick={removeCoupon}
            className="text-ink-faint hover:text-info bg-transparent border-0 cursor-pointer text-[12px]"
          >
            Remove
          </button>
        </div>
      ) : (
        <div className="flex gap-2 mb-2">
          <input
            value={couponInput}
            onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
            placeholder="Have a code?"
            className="field flex-1 uppercase"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyCoupon();
              }
            }}
          />
          <button
            type="button"
            onClick={applyCoupon}
            disabled={couponPending || couponInput.trim().length === 0}
            className="border border-line rounded-md px-3 text-[13px] text-ink-soft hover:text-ink shrink-0 cursor-pointer disabled:opacity-50"
          >
            {couponPending ? "…" : "Apply"}
          </button>
        </div>
      )}
      {couponMsg && <p className="text-[11px] text-info mb-2">{couponMsg}</p>}

      {applied && (
        <div className="flex justify-between text-[12px] text-ink-soft mb-3">
          <span>Discount</span>
          <span>−{formatPrice(applied.discountMinor, currency)}</span>
        </div>
      )}
      {!applied && <div className="mb-2" />}

      {/* Gift card */}
      <p className="text-[12px] font-medium m-0 mb-2">Gift card</p>
      {gift ? (
        <div className="flex items-center justify-between border border-brand/40 bg-brand-tint rounded-md px-[10px] py-2 mb-2 text-[13px]">
          <span className="text-brand font-medium">
            {gift.code} — {formatPrice(gift.balanceMinor, gift.currency)} balance
          </span>
          <button
            type="button"
            onClick={removeGift}
            className="text-ink-faint hover:text-info bg-transparent border-0 cursor-pointer text-[12px]"
          >
            Remove
          </button>
        </div>
      ) : (
        <div className="flex gap-2 mb-2">
          <input
            value={giftInput}
            onChange={(e) => setGiftInput(e.target.value.toUpperCase())}
            placeholder="GIFT-XXXX-XXXX-XXXX-XXXX"
            className="field flex-1 uppercase font-mono text-[12px]"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyGift();
              }
            }}
          />
          <button
            type="button"
            onClick={applyGift}
            disabled={giftPending || giftInput.trim().length === 0}
            className="border border-line rounded-md px-3 text-[13px] text-ink-soft hover:text-ink shrink-0 cursor-pointer disabled:opacity-50"
          >
            {giftPending ? "…" : "Apply"}
          </button>
        </div>
      )}
      {giftMsg && <p className="text-[11px] text-info mb-2">{giftMsg}</p>}

      {gift && giftMinor > 0 && (
        <div className="flex justify-between text-[12px] text-ink-soft mb-3">
          <span>Gift card</span>
          <span>−{formatPrice(giftMinor, currency)}</span>
        </div>
      )}
      {!gift && <div className="mb-2" />}

      <button
        type="submit"
        disabled={pending || email.length === 0 || !detailsValid}
        className="btn-primary w-full py-[10px]"
      >
        {pending
          ? "Redirecting…"
          : payMinor <= 0
            ? gift
              ? "Place order (gift card)"
              : "Get it free"
            : `Pay ${formatPrice(payMinor, currency)}`}
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
