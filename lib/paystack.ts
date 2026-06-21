import "server-only";

const SECRET = process.env.PAYSTACK_SECRET_KEY ?? "";

export const isPaystackConfigured = SECRET.length > 0;

export interface PaystackVerification {
  ok: boolean;
  amountMinor?: number;
  email?: string;
  orderId?: string;
}

/**
 * Verify a transaction with Paystack's API using the secret key. This is the
 * authoritative server-side check that a payment really succeeded — never trust
 * the browser's redirect params alone.
 */
export async function verifyPaystackTransaction(
  reference: string
): Promise<PaystackVerification> {
  if (!SECRET || !reference) return { ok: false };
  try {
    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${SECRET}` }, cache: "no-store" }
    );
    const json = await res.json();
    const d = json?.data;
    if (d?.status === "success") {
      return {
        ok: true,
        amountMinor: d.amount, // Paystack amount is already in minor units (kobo)
        email: d.customer?.email,
        orderId: d.metadata?.order_id,
      };
    }
  } catch {
    // fall through to not-ok
  }
  return { ok: false };
}
