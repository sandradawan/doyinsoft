"use server";

import { redirect } from "next/navigation";
import { activateByToken } from "@/lib/giftcards";
import { checkRateLimit, clientId } from "@/lib/ratelimit";

/** Activate a printed card by its token (store scans the QR, taps Activate). */
export async function activateCardAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  if (!token) redirect(`/activate/unknown`);
  // Throttle to deter mass token scanning.
  if (!(await checkRateLimit(`activate:${await clientId()}`, 20, 60_000))) {
    redirect(`/activate/${encodeURIComponent(token)}?err=rate`);
  }
  await activateByToken(token);
  redirect(`/activate/${encodeURIComponent(token)}?done=1`);
}
