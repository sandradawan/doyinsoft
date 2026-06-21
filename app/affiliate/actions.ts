"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  getOrCreateAffiliate,
  requestAffiliatePayout,
  saveAffiliateBank,
} from "@/lib/affiliate";

export interface AffState {
  error?: string;
  success?: string;
}

export async function saveBankAction(_prev: AffState, formData: FormData): Promise<AffState> {
  const user = await requireUser();
  const aff = await getOrCreateAffiliate(user.id, user.email);
  if (!aff) return { error: "Could not load your affiliate account." };
  await saveAffiliateBank(aff.id, {
    bank_code: String(formData.get("bank_code") ?? "").trim() || null,
    account_name: String(formData.get("account_name") ?? "").trim() || null,
    account_number: String(formData.get("account_number") ?? "").trim() || null,
  });
  revalidatePath("/affiliate");
  return { success: "Bank details saved." };
}

export async function requestPayoutAction(): Promise<AffState> {
  const user = await requireUser();
  const aff = await getOrCreateAffiliate(user.id, user.email);
  if (!aff) return { error: "Could not load your affiliate account." };
  const err = await requestAffiliatePayout(aff.id);
  revalidatePath("/affiliate");
  return err ? { error: err } : { success: "Payout requested — we’ll send it to your bank." };
}
