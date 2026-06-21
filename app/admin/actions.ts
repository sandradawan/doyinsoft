"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { hasServiceRole } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { getVendorOwnerEmail } from "@/lib/data";
import { emailLayout, sendEmail } from "@/lib/email";

async function setProductStatus(
  id: string,
  status: "approved" | "rejected",
  reason?: string
) {
  await requireAdmin();
  if (!hasServiceRole || !id) return;
  const admin = createAdminClient();
  const { data } = await admin
    .from("products")
    .update({ status, rejection_reason: reason ?? null })
    .eq("id", id)
    .select("name, vendor_id")
    .single();

  // Notify the vendor by email (no-op if email isn't configured).
  const row = data as { name: string; vendor_id: string } | null;
  if (row?.vendor_id) {
    const email = await getVendorOwnerEmail(row.vendor_id);
    if (email) {
      if (status === "approved") {
        await sendEmail({
          to: email,
          subject: `“${row.name}” is approved and live`,
          html: emailLayout(
            "Your product is live 🎉",
            `<p>“${row.name}” passed review and is now on the DoyinSoft storefront.</p>`
          ),
        });
      } else {
        await sendEmail({
          to: email,
          subject: `“${row.name}” wasn’t approved`,
          html: emailLayout(
            "Product needs changes",
            `<p>“${row.name}” wasn’t approved.${reason ? ` Reason: ${reason}` : ""}</p>
             <p>Update it and resubmit from your dashboard.</p>`
          ),
        });
      }
    }
  }

  revalidatePath("/admin/products");
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function approveProduct(formData: FormData) {
  await setProductStatus(String(formData.get("id") ?? ""), "approved");
}

export async function rejectProduct(formData: FormData) {
  const reason = String(formData.get("reason") ?? "").trim();
  await setProductStatus(String(formData.get("id") ?? ""), "rejected", reason || undefined);
}

export async function toggleFeatured(formData: FormData) {
  await requireAdmin();
  if (!hasServiceRole) return;
  const id = String(formData.get("id") ?? "");
  const featured = String(formData.get("featured") ?? "") === "true";
  await createAdminClient().from("products").update({ featured: !featured }).eq("id", id);
  revalidatePath("/admin/products");
  revalidatePath("/");
}

export async function toggleVerified(formData: FormData) {
  await requireAdmin();
  if (!hasServiceRole) return;
  const id = String(formData.get("id") ?? "");
  const verified = String(formData.get("verified") ?? "") === "true";
  await createAdminClient().from("vendors").update({ verified: !verified }).eq("id", id);
  revalidatePath("/admin/vendors");
}
