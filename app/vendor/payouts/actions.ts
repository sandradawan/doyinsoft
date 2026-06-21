"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getCurrentVendor } from "@/lib/auth";
import { getPayoutSummary } from "@/lib/data";

export interface PayoutState {
  error?: string;
  success?: string;
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
