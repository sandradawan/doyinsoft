"use server";

import { revalidatePath } from "next/cache";
import { hasServiceRole } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireVendor } from "@/lib/auth";

export async function markFulfilment(formData: FormData) {
  const vendor = await requireVendor();
  if (!hasServiceRole) return;
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!["pending", "shipped", "delivered"].includes(status)) return;
  await createAdminClient()
    .from("orders")
    .update({ fulfilment_status: status })
    .eq("id", id)
    .eq("vendor_id", vendor.id);
  revalidatePath("/vendor/orders");
}
