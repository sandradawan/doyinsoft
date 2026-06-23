"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { setGiftCardDisabled } from "@/lib/giftcards";
import { logAudit } from "@/lib/audit";

export async function toggleGiftCard(formData: FormData) {
  const adminEmail = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const disable = String(formData.get("disable") ?? "") === "1";
  await setGiftCardDisabled(id, disable);
  await logAudit(adminEmail, disable ? "giftcard.disable" : "giftcard.enable", "gift_card", id);
  revalidatePath("/admin/gift-cards");
}
