"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { hasServiceRole } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getLicenseByOrder,
  getOrderAmount,
  getVendorOwnerEmail,
  issueLicenseForOrder,
  sendReceiptForOrder,
} from "@/lib/data";
import { emailLayout, esc, sendEmail, subjectSafe } from "@/lib/email";
import { logAudit } from "@/lib/audit";
import { saveSettings } from "@/lib/settings";
import { refundPaystackTransaction, verifyPaystackTransaction } from "@/lib/paystack";
import { markAffiliatePayoutPaid } from "@/lib/affiliate";
import { vendorFollowerEmails } from "@/lib/follows";
import { emailButton, emailText, isEmailConfigured } from "@/lib/email";

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
    .select("name, slug, vendor_id, launched_at")
    .single();

  const row = data as { name: string; slug: string; vendor_id: string; launched_at: string | null } | null;
  const isFirstLaunch = status === "approved" && row && !row.launched_at;

  // First approval = launch date (powers the Launches board).
  if (status === "approved") {
    await admin
      .from("products")
      .update({ launched_at: new Date().toISOString() })
      .eq("id", id)
      .is("launched_at", null);
  }
  if (row?.vendor_id) {
    const email = await getVendorOwnerEmail(row.vendor_id);
    if (email) {
      if (status === "approved") {
        await sendEmail({
          to: email,
          subject: subjectSafe(`“${row.name}” is approved and live`),
          html: emailLayout("Your product is live 🎉", `<p>“${esc(row.name)}” passed review and is now on the storefront.</p>`),
        });
      } else {
        await sendEmail({
          to: email,
          subject: subjectSafe(`“${row.name}” was unpublished`),
          html: emailLayout("Product not live", `<p>“${esc(row.name)}” isn’t live.${reason ? ` Reason: ${esc(reason)}` : ""}</p><p>Update it and resubmit from your dashboard.</p>`),
        });
      }
    }
  }
  // Notify followers of the seller about a newly launched product.
  if (isFirstLaunch && row) {
    const followers = await vendorFollowerEmails(row.vendor_id);
    if (followers.length) {
      const { data: v } = await admin
        .from("vendors")
        .select("name")
        .eq("id", row.vendor_id)
        .maybeSingle();
      const vname = (v as { name?: string } | null)?.name ?? "A seller you follow";
      for (const to of followers) {
        await sendEmail({
          to,
          subject: subjectSafe(`New from ${vname}: ${row.name}`),
          html: emailLayout(
            `${esc(vname)} just dropped something new 🎉`,
            `${emailText(`<strong style="color:#171717">${esc(row.name)}</strong> is now live on DoyinMart.`)}
             <div style="margin:18px 0;">${emailButton(`${SITE_URL}/products/${row.slug}`, "View product")}</div>`
          ),
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
  const { data: order } = await admin
    .from("orders")
    .select("reference, status")
    .eq("id", id)
    .maybeSingle();
  const row = order as { reference?: string; status?: string } | null;

  // Don't double-refund an already-refunded order.
  if (row?.status === "refunded") return;

  // If there's a real payment, only proceed when Paystack ACTUALLY refunds it —
  // never mark the order refunded / revoke the license on a failed refund (that
  // would lock the buyer out while their money was never returned).
  const reference = row?.reference;
  if (reference) {
    const res = await refundPaystackTransaction(reference);
    if (!res.ok) {
      await logAudit(adminEmail, "refund_failed", "order", id, res.error ?? "unknown");
      revalidatePath("/admin/orders");
      return; // leave order/license untouched
    }
  }
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
      subject: subjectSafe(`Your ${license.product.name} license`),
      html: emailLayout(
        "Here’s your license again",
        `<p>License for <strong>${esc(license.product.name)}</strong>:</p>
         <p style="font-size:15px;font-weight:600">${esc(license.key)}</p>
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

// ---- Recover a payment by Paystack reference ---------------------------------

export interface RecoverState {
  error?: string;
  success?: string;
}

/**
 * Verify a Paystack reference and issue the license + branded receipt for it.
 * Use this to recover async/bank-transfer payments that came in before the
 * webhook was set up. Idempotent — re-running won't double-issue or re-email.
 */
export async function processPaymentByReference(
  _prev: RecoverState,
  formData: FormData
): Promise<RecoverState> {
  const adminEmail = await requireAdmin();
  const reference = String(formData.get("reference") ?? "").trim();
  if (!reference) return { error: "Enter a Paystack transaction reference." };

  const v = await verifyPaystackTransaction(reference);
  if (!v.ok) {
    return {
      error: "Paystack couldn't confirm this reference as a successful payment. Check the reference.",
    };
  }
  if (!v.orderId) {
    return {
      error:
        "This payment isn't linked to a DoyinMart order (no order_id). It may not have gone through checkout.",
    };
  }

  // Verify the amount actually paid covers the order total — never issue on an
  // underpaid / mismatched transaction.
  const ord = await getOrderAmount(v.orderId);
  if (ord && (v.amountMinor ?? 0) < ord.amount_minor) {
    return {
      error: `Paid amount (${(v.amountMinor ?? 0) / 100}) is less than the order total (${ord.amount_minor / 100}). Not issuing.`,
    };
  }

  // Issue if missing (this emails on first issue), then always (re)send the
  // receipt so the buyer definitely gets it — even if it was already issued.
  const existing = await getLicenseByOrder(v.orderId);
  const license = existing ?? (await issueLicenseForOrder(v.orderId, v.email ?? "", reference));
  if (!license) {
    return { error: "Verified, but the matching order couldn't be found to issue the license." };
  }
  if (existing) await sendReceiptForOrder(v.orderId);

  await logAudit(adminEmail, "recover_payment", "order", v.orderId, reference);
  const buyer = license.email || v.email || "the buyer";
  return {
    success: `Done. Branded receipt sent to ${buyer}. ⚠ It goes to the BUYER's inbox (not yours) — check ${buyer}'s inbox and spam.`,
  };
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
  const res = await sendEmail({
    to: adminEmail,
    subject: "DoyinMart — production email test ✅",
    html: emailLayout(
      "Email is working ✅",
      emailText(
        "If you can read this, transactional email (receipts, license keys, sale alerts) is working in this environment."
      )
    ),
  });
  await logAudit(adminEmail, "send_test_email", "email", res.ok ? "ok" : res.error);
  if (!res.ok) {
    return { error: `Send failed (${res.via ?? "email"}): ${res.error ?? "unknown error"}` };
  }
  return { success: `Sent to ${adminEmail} via ${res.via}. Check your inbox (and spam folder).` };
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
