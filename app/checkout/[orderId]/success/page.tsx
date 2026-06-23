import Link from "next/link";
import { Check, Download, Clock, X, Package } from "lucide-react";
import {
  getLicenseByOrder,
  getOrderById,
  getProductBySlug,
  issueLicenseForOrder,
  markOrderPaid,
} from "@/lib/data";
import { isPaystackConfigured, verifyPaystackTransaction } from "@/lib/paystack";
import { WhatsAppButton } from "@/components/whatsapp-button";
import type { License } from "@/lib/types";

type Outcome = "issued" | "demo" | "pending" | "failed";

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

  const order = await getOrderById(orderId);
  const productType = order?.product?.product_type ?? "digital";
  const isFulfilment =
    (order?.fulfilment_status ?? null) !== null || productType === "physical" || productType === "service";

  // Confirm the payment (shared by both flows).
  let paid = false;
  if (isPaystackConfigured) {
    if (ref) {
      const v = await verifyPaystackTransaction(ref);
      // Require: verified success, the reference belongs to THIS order, and the
      // amount paid covers the order total (defense-in-depth, mirrors the webhook).
      paid =
        v.ok &&
        (!order || (v.orderId === orderId && (v.amountMinor ?? 0) >= order.amount_minor));
    } else {
      paid = order?.status === "paid";
    }
  } else {
    paid = true; // demo
  }

  // ---- Physical / service orders: confirm + hand off to the seller ----
  if (isFulfilment) {
    if (!paid) return <PendingOrFailed confirmed={isPaystackConfigured && !ref} />;
    if (isPaystackConfigured) await markOrderPaid(orderId, ref);

    const product = order ? await getProductBySlug(order.product.slug) : null;
    const vendorWa = product?.vendor.whatsapp ?? null;

    return (
      <Shell icon={<Package size={16} className="text-success" />} iconBg="bg-success-bg">
        <h1 className="text-[22px] font-medium m-0 mb-1">Order placed 🎉</h1>
        <p className="text-[13px] text-ink-soft m-0 mb-5">
          Payment received for <strong>{order?.product.name}</strong>. The seller will{" "}
          {productType === "physical" ? "ship it to your address" : "reach out to fulfil your order"}
          {order?.shipping_phone ? ` and may contact you on ${order.shipping_phone}` : ""}.
        </p>
        {vendorWa && (
          <WhatsAppButton
            phone={vendorWa}
            text={`Hi, I just ordered ${order?.product.name} on DoyinMart.`}
            label="Message the seller on WhatsApp"
          />
        )}
        <div className="mt-6">
          <Link href="/" className="text-[13px] text-ink-soft no-underline hover:text-ink">
            ← Back to store
          </Link>
        </div>
      </Shell>
    );
  }

  // ---- Digital orders: issue + show the license ----
  let license: License | null = null;
  let outcome: Outcome = "pending";
  if (isPaystackConfigured) {
    if (ref) {
      if (paid) {
        license = await issueLicenseForOrder(orderId, order?.buyer_email ?? email ?? "", ref);
        outcome = license ? "issued" : "pending";
      } else {
        outcome = "failed";
      }
    } else {
      license = await getLicenseByOrder(orderId);
      outcome = license ? "issued" : "pending";
    }
  } else {
    license = await issueLicenseForOrder(orderId, email ?? "");
    outcome = license ? "demo" : "failed";
  }

  if (outcome === "failed") {
    return (
      <Shell icon={<X size={16} className="text-info" />} iconBg="bg-info-bg">
        <h1 className="text-[22px] font-medium m-0 mb-1">Payment not confirmed</h1>
        <p className="text-[13px] text-ink-soft m-0 mb-5">
          We couldn&rsquo;t verify this payment. If you were charged, contact support with your
          payment reference — no license is issued until a payment is confirmed.
        </p>
        <Link href="/" className="text-[13px] text-ink-soft no-underline hover:text-ink">
          ← Back to store
        </Link>
      </Shell>
    );
  }

  if (outcome === "pending") return <PendingOrFailed confirmed />;

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
          Demo mode — add Paystack keys to take real payments. This key was issued without a charge.
        </p>
      )}

      <p className="text-[11px] text-ink-faint mt-3 mb-0">
        Find your keys and downloads any time on your{" "}
        <Link href="/account" className="text-ink-soft hover:text-ink">
          account
        </Link>
        .
      </p>
    </Shell>
  );
}

function PendingOrFailed({ confirmed }: { confirmed: boolean }) {
  return (
    <Shell icon={<Clock size={16} className="text-info" />} iconBg="bg-info-bg">
      <h1 className="text-[22px] font-medium m-0 mb-1">Confirming your payment…</h1>
      <p className="text-[13px] text-ink-soft m-0 mb-5">
        {confirmed
          ? "This can take a few seconds. Refresh shortly — your order appears once payment is confirmed."
          : "Waiting on payment confirmation. Refresh this page in a moment."}
      </p>
      <Link href="/" className="text-[13px] text-ink-soft no-underline hover:text-ink">
        ← Back to store
      </Link>
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
