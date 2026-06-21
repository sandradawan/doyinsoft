"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasServiceRole, isSupabaseConfigured } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentVendor } from "@/lib/auth";
import { getPayoutSummary } from "@/lib/data";
import { createPaystackSubaccount, isPaystackConfigured } from "@/lib/paystack";
import { getSettings } from "@/lib/settings";

export interface PayoutState {
  error?: string;
  success?: string;
}

/**
 * Connect the vendor's bank by creating a Paystack subaccount. Once connected,
 * each sale is split automatically — the vendor's share settles to this bank.
 */
export async function connectPayouts(
  _prev: PayoutState,
  formData: FormData
): Promise<PayoutState> {
  if (!isPaystackConfigured || !hasServiceRole) {
    return {
      error:
        "Connecting payouts needs Paystack keys and a Supabase service-role key in the environment.",
    };
  }
  const vendor = await getCurrentVendor();
  if (!vendor) return { error: "Please sign in first." };

  const bankCode = String(formData.get("bank_code") ?? "").trim();
  const bankName = String(formData.get("bank_name") ?? "").trim();
  const accountNumber = String(formData.get("account_number") ?? "").trim();
  const accountName = String(formData.get("account_name") ?? "").trim();

  if (!bankCode || accountNumber.length < 10) {
    return { error: "Choose your bank and enter a valid 10-digit account number." };
  }

  const { commission_percent } = await getSettings();
  const sub = await createPaystackSubaccount({
    businessName: vendor.name,
    bankCode,
    accountNumber,
    commission: commission_percent,
  });
  if (sub.error || !sub.code) {
    return { error: sub.error ?? "Could not connect your bank." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("vendors")
    .update({
      subaccount_code: sub.code,
      payout_bank: bankName,
      payout_bank_code: bankCode,
      payout_account_name: accountName,
      payout_account_number: accountNumber,
    })
    .eq("id", vendor.id);
  if (error) return { error: error.message };

  revalidatePath("/vendor/payouts");
  return { success: "Bank connected — your sales now settle automatically." };
}

export async function updatePayoutDetails(
  _prev: PayoutState,
  formData: FormData
): Promise<PayoutState> {
  if (!isSupabaseConfigured) {
    return { error: "Connect Supabase to save withdrawal details." };
  }
  const vendor = await getCurrentVendor();
  if (!vendor) return { error: "Please sign in first." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("vendors")
    .update({
      payout_bank: String(formData.get("bank") ?? "").trim(),
      payout_account_name: String(formData.get("account_name") ?? "").trim(),
      payout_account_number: String(formData.get("account_number") ?? "").trim(),
    })
    .eq("id", vendor.id);
  if (error) return { error: error.message };

  revalidatePath("/vendor/payouts");
  return { success: "Withdrawal details saved." };
}

export async function requestPayout(): Promise<PayoutState> {
  if (!isSupabaseConfigured) {
    return { error: "Connect Supabase to request payouts." };
  }
  const vendor = await getCurrentVendor();
  if (!vendor) return { error: "Please sign in first." };

  const summary = await getPayoutSummary(vendor.id);
  if (summary.available_minor <= 0) {
    return { error: "No cleared funds available to withdraw." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("payouts").insert({
    vendor_id: vendor.id,
    amount_minor: summary.available_minor,
    currency: summary.currency,
    status: "requested",
    method: "Bank transfer",
  });
  if (error) return { error: error.message };

  revalidatePath("/vendor/payouts");
  return { success: "Payout requested — it will be sent to your bank account." };
}
