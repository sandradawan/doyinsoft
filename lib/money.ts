import type { Currency } from "./types";

/**
 * USD → NGN rate used to charge Paystack in NGN (Nigerian accounts can't charge
 * USD). Override with NEXT_PUBLIC_USD_TO_NGN; defaults to 1600.
 */
export const USD_TO_NGN = Number(process.env.NEXT_PUBLIC_USD_TO_NGN ?? "") || 1600;

/**
 * Convert a price to the NGN amount (in kobo) we actually charge.
 * USD minor units are cents; cents × rate = kobo, so the math is a clean
 * multiply. NGN passes through unchanged.
 */
export function toNgnCharge(minor: number, currency: Currency): number {
  return currency === "USD" ? Math.round(minor * USD_TO_NGN) : minor;
}
