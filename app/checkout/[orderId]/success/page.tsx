import Link from "next/link";
import { Check, Download } from "lucide-react";
import { issueLicenseForOrder } from "@/lib/data";

/**
 * Post-payment confirmation. The license is issued (or fetched if the webhook
 * already created it) and the gated download is offered. In mock mode the key
 * is deterministic and the download streams a license certificate.
 */
export default async function CheckoutSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ email?: string }>;
}) {
  const { orderId } = await params;
  const { email } = await searchParams;

  const license = await issueLicenseForOrder(orderId, email ?? "");

  const downloadHref = license
    ? `/api/download?order=${encodeURIComponent(orderId)}&key=${encodeURIComponent(license.key)}`
    : `/api/download?order=${encodeURIComponent(orderId)}`;

  return (
    <main className="max-w-[460px] mx-auto px-5 py-8">
      <div className="w-8 h-8 rounded-full bg-success-bg flex items-center justify-center mb-3">
        <Check size={16} className="text-success" aria-hidden />
      </div>
      <h1 className="text-[22px] font-medium m-0 mb-1">Payment received</h1>
      <p className="text-[13px] text-ink-soft m-0 mb-5">
        {license
          ? `Your license for ${license.product.name} has been issued. A copy has been sent to your email.`
          : "Your payment was received. Your license is being issued."}
      </p>

      <p className="text-[12px] font-medium m-0 mb-2">License key</p>
      <div className="border border-line rounded-md p-3 bg-muted text-[13px] tracking-wide mb-5 break-all">
        {license?.key ?? "—"}
      </div>

      <a
        href={downloadHref}
        className="btn-primary inline-flex items-center gap-2 px-4 py-[10px] no-underline"
      >
        <Download size={14} aria-hidden /> Download software
      </a>

      <p className="text-[11px] text-ink-faint mt-3 mb-0">
        Download links are personal and expire shortly. Find them again any time on your{" "}
        <Link href="/downloads" className="text-ink-soft hover:text-ink">
          downloads page
        </Link>
        .
      </p>

      <div className="mt-6">
        <Link href="/" className="text-[13px] text-ink-soft no-underline hover:text-ink">
          ← Back to store
        </Link>
      </div>
    </main>
  );
}
