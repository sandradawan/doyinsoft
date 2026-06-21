import "server-only";

const SECRET = process.env.PAYSTACK_SECRET_KEY ?? "";

export const isPaystackConfigured = SECRET.length > 0;

/** Platform commission kept on each sale (percent). Override with env. */
export const PLATFORM_COMMISSION_PERCENT =
  Number(process.env.PLATFORM_COMMISSION_PERCENT ?? "") || 15;

export interface Bank {
  name: string;
  code: string;
}

/** List Nigerian banks (name + Paystack code) for the payout bank selector. */
export async function listPaystackBanks(): Promise<Bank[]> {
  if (!SECRET) return [];
  try {
    const res = await fetch("https://api.paystack.co/bank?currency=NGN&perPage=100", {
      headers: { Authorization: `Bearer ${SECRET}` },
      next: { revalidate: 86400 },
    });
    const json = await res.json();
    return ((json?.data ?? []) as { name: string; code: string }[]).map((b) => ({
      name: b.name,
      code: b.code,
    }));
  } catch {
    return [];
  }
}

/**
 * Create a Paystack subaccount for a vendor. percentage_charge is the platform's
 * commission, so the vendor receives (100 - commission)% settled to their bank.
 */
export async function createPaystackSubaccount(opts: {
  businessName: string;
  bankCode: string;
  accountNumber: string;
}): Promise<{ code?: string; error?: string }> {
  if (!SECRET) return { error: "Paystack is not configured." };
  try {
    const res = await fetch("https://api.paystack.co/subaccount", {
      method: "POST",
      headers: { Authorization: `Bearer ${SECRET}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        business_name: opts.businessName,
        settlement_bank: opts.bankCode,
        account_number: opts.accountNumber,
        percentage_charge: PLATFORM_COMMISSION_PERCENT,
      }),
    });
    const json = await res.json();
    const code = json?.data?.subaccount_code as string | undefined;
    if (json?.status && code) return { code };
    return { error: json?.message ?? "Could not create the payout account." };
  } catch {
    return { error: "Could not reach Paystack." };
  }
}

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
