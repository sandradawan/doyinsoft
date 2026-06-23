"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { setGiftCardDisabled, activateGiftCard, batchCreateGiftCards } from "@/lib/giftcards";
import { giftDesign } from "@/lib/gift-designs";
import { logAudit } from "@/lib/audit";

export async function toggleGiftCard(formData: FormData) {
  const adminEmail = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const disable = String(formData.get("disable") ?? "") === "1";
  await setGiftCardDisabled(id, disable);
  await logAudit(adminEmail, disable ? "giftcard.disable" : "giftcard.enable", "gift_card", id);
  revalidatePath("/admin/gift-cards");
}

export async function activateGiftCardAction(formData: FormData) {
  const adminEmail = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  await activateGiftCard(id);
  await logAudit(adminEmail, "giftcard.activate", "gift_card", id);
  revalidatePath("/admin/gift-cards");
}

/** Create a batch of printable cards, then jump to the print sheet. */
export async function createGiftCardBatch(formData: FormData) {
  const adminEmail = await requireAdmin();
  const count = Number(formData.get("count") ?? 0);
  const amountMinor = Math.round(Number(formData.get("amount") ?? 0) * 100);
  const design = giftDesign(String(formData.get("design") ?? "")).key;
  const active = String(formData.get("active") ?? "") === "1";

  const res = await batchCreateGiftCards({ count, amountMinor, design, active });
  if ("error" in res) {
    redirect(`/admin/gift-cards?error=${encodeURIComponent(res.error)}`);
  }
  await logAudit(
    adminEmail,
    "giftcard.batch_create",
    "gift_card",
    res.batchRef,
    `${res.cards.length} × ${amountMinor / 100} (${active ? "active" : "inactive"})`
  );
  redirect(`/admin/gift-cards/print?batch=${res.batchRef}`);
}
