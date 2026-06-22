"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { hasServiceRole } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLicenseByOrder, getVendorOwnerEmail } from "@/lib/data";
import { emailLayout, sendEmail } from "@/lib/email";
import { logAudit } from "@/lib/audit";
import { saveSettings } from "@/lib/settings";
import { refundPaystackTransaction } from "@/lib/paystack";
import { markAffiliatePayoutPaid } from "@/lib/affiliate";
import { emailText, isEmailConfigured } from "@/lib/email";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// ---- Products ----------------------------------------------------------------

async function setProductStatus(
  adminEmail: string,
  id: string,
  status: "approved" | "rejected",
  reason?: string
) {
  if (!hasServiceRole || !id) return;
  const admin = createAdminClient();
  const { data } = await admin
    .from("products")
    .update({ status, rejection_reason: reason ?? null })
    .eq("id", id)
    .select("name, vendor_id")
    .single();

  // First approval = launch date (powers the Launches board).
  if (status === "approved") {
    await admin
      .from("products")
      .update({ launched_at: new Date().toISOString() })
      .eq("id", id)
      .is("launched_at", null);
  }

  const row = data as { name: string; vendor_id: string } | null;
  if (row?.vendor_id) {
    const email = await getVendorOwnerEmail(row.vendor_id);
    if (email) {
      if (status === "approved") {
        await sendEmail({
          to: email,
          subject: `“${row.name}” is approved and live`,
          html: emailLayout("Your product is live 🎉", `<p>“${row.name}” passed review and is now on the storefront.</p>`),
        });
      } else {
        await sendEmail({
          to: email,
          subject: `“${row.name}” was unpublished`,
          html: emailLayout("Product not live", `<p>“${row.name}” isn’t live.${reason ? ` Reason: ${reason}` : ""}</p><p>Update it and resubmit from your dashboard.</p>`),
        });
      }
    }
  }
  await logAudit(adminEmail, status === "approved" ? "approve_product" : "reject_product", "product", id, reason);
  revalidatePath("/admin/products");
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function approveProduct(formData: FormData) {
  const admin = await requireAdmin();
  await setProductStatus(admin, String(formData.get("id") ?? ""), "approved");
}

export async function rejectProduct(formData: FormData) {
  const admin = await requireAdmin();
  const reason = String(formData.get("reason") ?? "").trim();
  await setProductStatus(admin, String(formData.get("id") ?? ""), "rejected", reason || undefined);
}

export async function toggleFeatured(formData: FormData) {
  const adminEmail = await requireAdmin();
  if (!hasServiceRole) return;
  const id = String(formData.get("id") ?? "");
  const featured = String(formData.get("featured") ?? "") === "true";
  await createAdminClient().from("products").update({ featured: !featured }).eq("id", id);
  await logAudit(adminEmail, featured ? "unfeature_product" : "feature_product", "product", id);
  revalidatePath("/admin/products");
  revalidatePath("/");
}

export async function deleteProduct(formData: FormData) {
  const adminEmail = await requireAdmin();
  if (!hasServiceRole) return;
  const id = String(formData.get("id") ?? "");
  const admin = createAdminClient();
  // Remove reviews first; if the product has orders (FK restrict), fall back to
  // unpublishing instead of failing.
  await admin.from("reviews").delete().eq("product_id", id);
  const { error } = await admin.from("products").delete().eq("id", id);
  if (error) {
    await admin.from("products").update({ status: "rejected", rejection_reason: "Removed by admin" }).eq("id", id);
    await logAudit(adminEmail, "unpublish_product_has_orders", "product", id);
  } else {
    await logAudit(adminEmail, "delete_product", "product", id);
  }
  revalidatePath("/admin/products");
  revalidatePath("/");
}

// ---- Vendors -----------------------------------------------------------------

export async function toggleVerified(formData: FormData) {
  const adminEmail = await requireAdmin();
  if (!hasServiceRole) return;
  const id = String(formData.get("id") ?? "");
  const verified = String(formData.get("verified") ?? "") === "true";
  await createAdminClient().from("vendors").update({ verified: !verified }).eq("id", id);
  await logAudit(adminEmail, verified ? "unverify_vendor" : "verify_vendor", "vendor", id);
  revalidatePath("/admin/vendors");
}

export async function toggleSuspended(formData: FormData) {
  const adminEmail = await requireAdmin();
  if (!hasServiceRole) return;
  const id = String(formData.get("id") ?? "");
  const suspended = String(formData.get("suspended") ?? "") === "true";
  await createAdminClient().from("vendors").update({ suspended: !suspended }).eq("id", id);
  await logAudit(adminEmail, suspended ? "unban_vendor" : "ban_vendor", "vendor", id);
  revalidatePath("/admin/vendors");
  revalidatePath("/");
}

// ---- Reviews -----------------------------------------------------------------

export async function deleteReview(formData: FormData) {
  const adminEmail = await requireAdmin();
  if (!hasServiceRole) return;
  const id = String(formData.get("id") ?? "");
  await createAdminClient().from("reviews").delete().eq("id", id);
  await logAudit(adminEmail, "delete_review", "review", id);
  revalidatePath("/admin/reviews");
}

// ---- Orders / licenses -------------------------------------------------------

export async function refundOrder(formData: FormData) {
  const adminEmail = await requireAdmin();
  if (!hasServiceRole) return;
  const id = String(formData.get("id") ?? "");
  const admin = createAdminClient();
  const { data: order } = await admin.from("orders").select("reference").eq("id", id).maybeSingle();
  const reference = (order as { reference?: string } | null)?.reference;
  if (reference) await refundPaystackTransaction(reference);
  await admin.from("orders").update({ status: "refunded" }).eq("id", id);
  await admin.from("licenses").update({ status: "revoked" }).eq("order_id", id);
  await logAudit(adminEmail, "refund_order", "order", id, reference ?? "no-reference");
  revalidatePath("/admin/orders");
}

export async function revokeLicense(formData: FormData) {
  const adminEmail = await requireAdmin();
  if (!hasServiceRole) return;
  const orderId = String(formData.get("id") ?? "");
  await createAdminClient().from("licenses").update({ status: "revoked" }).eq("order_id", orderId);
  await logAudit(adminEmail, "revoke_license", "order", orderId);
  revalidatePath("/admin/orders");
}

export async function resendLicense(formData: FormData) {
  const adminEmail = await requireAdmin();
  const orderId = String(formData.get("id") ?? "");
  const license = await getLicenseByOrder(orderId);
  if (license?.email) {
    const dl = `${SITE_URL}/api/download?order=${encodeURIComponent(orderId)}&key=${encodeURIComponent(license.key)}`;
    await sendEmail({
      to: license.email,
      subject: `Your ${license.product.name} license`,
      html: emailLayout(
        "Here’s your license again",
        `<p>License for <strong>${license.product.name}</strong>:</p>
         <p style="font-size:15px;font-weight:600">${license.key}</p>
         <p><a href="${dl}" style="background:#047857;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;display:inline-block">Download software</a></p>`
      ),
    });
  }
  await logAudit(adminEmail, "resend_license", "order", orderId);
  revalidatePath("/admin/orders");
}

// ---- Affiliate payouts -------------------------------------------------------

export async function markAffiliatePaid(formData: FormData) {
  const adminEmail = await requireAdmin();
  if (!hasServiceRole) return;
  const id = String(formData.get("id") ?? "");
  await markAffiliatePayoutPaid(id);
  await logAudit(adminEmail, "mark_affiliate_paid", "affiliate_payout", id);
  revalidatePath("/admin/affiliates");
}

// ---- Categories --------------------------------------------------------------

export async function addCategory(formData: FormData) {
  const adminEmail = await requireAdmin();
  if (!hasServiceRole) return;
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await createAdminClient().from("categories").upsert({ name }, { onConflict: "name" });
  await logAudit(adminEmail, "add_category", "category", undefined, name);
  revalidatePath("/admin/categories");
}

export async function deleteCategory(formData: FormData) {
  const adminEmail = await requireAdmin();
  if (!hasServiceRole) return;
  const id = String(formData.get("id") ?? "");
  await createAdminClient().from("categories").delete().eq("id", id);
  await logAudit(adminEmail, "delete_category", "category", id);
  revalidatePath("/admin/categories");
}

// ---- Email test --------------------------------------------------------------

export interface TestEmailState {
  error?: string;
  success?: string;
}

export async function sendTestEmail(): Promise<TestEmailState> {
  const adminEmail = await requireAdmin();
  if (!isEmailConfigured) {
    return {
      error:
        "Email is NOT configured in this environment. Set GMAIL_USER + GMAIL_APP_PASSWORD (or RESEND_API_KEY) in your deployment and redeploy.",
    };
  }
  await sendEmail({
    to: adminEmail,
    subject: "DoyinSoft — production email test ✅",
    html: emailLayout(
      "Email is working ✅",
      emailText(
        "If you can read this, transactional email (receipts, license keys, sale alerts) is working in this environment."
      )
    ),
  });
  await logAudit(adminEmail, "send_test_email", "email");
  return { success: `Sent to ${adminEmail}. Check your inbox (and spam folder).` };
}

// ---- Settings ----------------------------------------------------------------

export interface SettingsState {
  success?: string;
  error?: string;
}

export async function updateSettingsAction(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const adminEmail = await requireAdmin();
  if (!hasServiceRole) return { error: "Settings need a connected Supabase project." };
  const commission = Number(formData.get("commission_percent"));
  const usd = Number(formData.get("usd_to_ngn"));
  const affiliate = Number(formData.get("affiliate_percent"));
  if (!(commission >= 0 && commission < 100)) return { error: "Commission must be 0–99%." };
  if (!(usd > 0)) return { error: "USD→NGN rate must be greater than 0." };
  if (!(affiliate >= 0 && affiliate < 100)) return { error: "Affiliate % must be 0–99%." };
  await saveSettings({ commission_percent: commission, usd_to_ngn: usd, affiliate_percent: affiliate });
  await logAudit(adminEmail, "update_settings", "settings", undefined, `commission=${commission} usd=${usd} affiliate=${affiliate}`);
  revalidatePath("/admin/settings");
  return { success: "Settings saved." };
}
