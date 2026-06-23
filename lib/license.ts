import { createHash, randomBytes } from "crypto";

/** A fresh, random license key: DOYIN-XXXX-XXXX-XXXX-XXXX (hex, uppercase). */
export function generateLicenseKey(): string {
  const seg = () => randomBytes(2).toString("hex").toUpperCase();
  return `DOYIN-${seg()}-${seg()}-${seg()}-${seg()}`;
}

/**
 * Deterministic key derived from an order id. Used in mock mode (no Supabase)
 * so the same order always shows the same key without persistence.
 */
export function deterministicLicenseKey(orderId: string): string {
  const hex = createHash("sha256").update(orderId).digest("hex").toUpperCase();
  return `DOYIN-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}`;
}

/** Shape of the .txt certificate handed to buyers in the mock download flow. */
export function licenseCertificate(opts: {
  productName: string;
  version: string;
  key: string;
  email: string;
  issuedAt: string;
}): string {
  return [
    "DoyinMart — software license certificate",
    "==========================================",
    "",
    `Product:     ${opts.productName}`,
    `Version:     ${opts.version}`,
    `License key: ${opts.key}`,
    `Licensed to: ${opts.email || "—"}`,
    `Issued:      ${opts.issuedAt}`,
    "",
    "This is a single-user, non-transferable license.",
    "Activate the app by entering the license key above.",
    "",
    "(Demo certificate — connect Supabase Storage to deliver the real binary.)",
    "",
  ].join("\n");
}
