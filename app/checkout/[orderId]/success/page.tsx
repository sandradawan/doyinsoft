import Link from "next/link";
import { Check, Download, Clock, X } from "lucide-react";
import { getLicenseByOrder, getOrderById, issueLicenseForOrder } from "@/lib/data";
import { isPaystackConfigured, verifyPaystackTransaction } from "@/lib/paystack";
import type { License } from "@/lib/types";

type Outcome = "issued" | "demo" | "pending" | "failed";

/**
 * Post-payment page. Confirms the payment server-side (Paystack verify API)
 * before issuing/showing the license. Issuance is idempotent per order, so a
 * refresh — or the webhook arriving first — never creates a duplicate key.
 */
export default async function CheckoutSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ email?: string; reference?: string; trxref?: string }>;
}) {
  const { orderId } = await params;
  const { email, reference, trxref } = await searchParams;
  const ref = reference || trxref;

  let license: License | null = null;
  let outcome: Outcome = "pending";

  if (isPaystackConfigured) {
    if (ref) {
      // Real payment: verify with Paystack, check the amount, then issue.
      const v = await verifyPaystackTransaction(ref);
      const order = await getOrderById(orderId);
      const amountOk = v.ok && (!order || v.amountMinor === order.amount_minor);
      if (v.ok && amountOk) {
        license = await issueLicenseForOrder(orderId, v.email ?? email ?? "", ref);
        outcome = license ? "issued" : "pending";
      } else {
        outcome = "failed";
      }
    } else {
      // No reference (e.g. webhook may have already issued it) — read it back.
      license = await getLicenseByOrder(orderId);
      outcome = license ? "issued" : "pending";
    }
  } else {
    // Demo mode (no Paystack keys): issue a clearly-labelled demo license.
    license = await issueLicenseForOrder(orderId, email ?? "");
    outcome = license ? "demo" : "failed";
  }

  if (outcome === "failed") {
    return (
      <Shell icon={<X size={16} className="text-info" />} iconBg="bg-info-bg">
        <h1 className="text-[22px] font-medium m-0 mb-1">Payment not confirmed</h1>
        <p className="text-[13px] text-ink-soft m-0 mb-5">
          We couldn&rsquo;t verify this payment. If you were charged, contact support with
          your payment reference and we&rsquo;ll sort it out — no license is issued until a
          payment is confirmed.
        </p>
        <Link href="/" className="text-[13px] text-ink-soft no-underline hover:text-ink">
          ← Back to store
        </Link>
      </Shell>
    );
  }

  if (outcome === "pending") {
    return (
      <Shell icon={<Clock size={16} className="text-info" />} iconBg="bg-info-bg">
        <h1 className="text-[22px] font-medium m-0 mb-1">Confirming your payment…</h1>
        <p className="text-[13px] text-ink-soft m-0 mb-5">
          This can take a few seconds. Refresh this page shortly, or check your{" "}
          <Link href="/downloads" className="text-brand hover:underline">
            downloads page
          </Link>{" "}
          — your license and download appear there once payment is confirmed.
        </p>
        <Link href="/" className="text-[13px] text-ink-soft no-underline hover:text-ink">
          ← Back to store
        </Link>
      </Shell>
    );
  }

  // issued / demo
  const downloadHref = `/api/download?order=${encodeURIComponent(orderId)}&key=${encodeURIComponent(license!.key)}`;

  return (
    <Shell icon={<Check size={16} className="text-success" />} iconBg="bg-success-bg">
      <h1 className="text-[22px] font-medium m-0 mb-1">Payment received</h1>
      <p className="text-[13px] text-ink-soft m-0 mb-5">
        Your license for {license!.product.name} has been issued
        {license!.email ? ` and emailed to ${license!.email}` : ""}.
      </p>

      <p className="text-[12px] font-medium m-0 mb-2">License key</p>
      <div className="border border-line rounded-md p-3 bg-muted text-[13px] tracking-wide mb-5 break-all">
        {license!.key}
      </div>

      <a
        href={downloadHref}
        className="btn-primary inline-flex items-center gap-2 px-4 py-[10px] no-underline"
      >
        <Download size={14} aria-hidden /> Download software
      </a>

      {outcome === "demo" && (
        <p className="text-[11px] text-info bg-info-bg rounded-md px-3 py-2 mt-4 mb-0">
          Demo mode — add Paystack keys to take real payments. This key was issued without a
          charge for testing.
        </p>
      )}

      <p className="text-[11px] text-ink-faint mt-3 mb-0">
        Find your keys and downloads any time on your{" "}
        <Link href="/downloads" className="text-ink-soft hover:text-ink">
          downloads page
        </Link>
        .
      </p>
    </Shell>
  );
}

function Shell({
  icon,
  iconBg,
  children,
}: {
  icon: React.ReactNode;
  iconBg: string;
  children: React.ReactNode;
}) {
  return (
    <main className="max-w-[460px] mx-auto px-5 py-8">
      <div className={`w-8 h-8 rounded-full ${iconBg} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      {children}
    </main>
  );
}
