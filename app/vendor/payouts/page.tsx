import { VendorShell } from "@/components/vendor-shell";
import { getPayoutDetails, getPayouts, getPayoutSummary } from "@/lib/data";
import { requireVendor } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import type { PayoutStatus } from "@/lib/types";
import { PayoutDetailsForm, RequestPayoutButton } from "./payouts-client";

function shortDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const PAYOUT_BADGE: Record<PayoutStatus, string> = {
  paid: "bg-success-bg text-success",
  requested: "bg-info-bg text-info",
  failed: "bg-muted text-ink-soft",
};

export default async function VendorPayoutsPage() {
  const vendor = await requireVendor();
  const [summary, payouts, details] = await Promise.all([
    getPayoutSummary(vendor.id),
    getPayouts(vendor.id),
    getPayoutDetails(vendor.id),
  ]);

  const cards = [
    { label: "Available to withdraw", value: formatPrice(summary.available_minor, summary.currency) },
    { label: "Pending (settling)", value: formatPrice(summary.pending_minor, summary.currency) },
    { label: "Total paid out", value: formatPrice(summary.paid_out_minor, summary.currency) },
  ];

  return (
    <VendorShell active="payouts">
      <p className="text-[13px] font-medium m-0 mb-3">Payouts</p>

      {/* Balance cards */}
      <div className="grid [grid-template-columns:repeat(3,1fr)] gap-3 mb-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-muted rounded-md p-4">
            <p className="text-[13px] text-ink-soft m-0 mb-[6px]">{c.label}</p>
            <p className="text-[22px] font-medium m-0">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-8">
        <RequestPayoutButton canWithdraw={summary.available_minor > 0} />
        <p className="text-[11px] text-ink-faint mt-2 mb-0">
          Cleared funds are sent to the bank account below, usually within 1–2 business days.
        </p>
      </div>

      {/* Payout history */}
      <p className="text-[13px] font-medium m-0 mb-2">Payout history</p>
      {payouts.length === 0 ? (
        <p className="text-[13px] text-ink-soft mb-8">No payouts yet.</p>
      ) : (
        <div className="mb-8">
          {payouts.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 py-3 border-t border-line text-[13px]"
            >
              <span className="w-24 shrink-0 text-ink-soft">{shortDate(p.created_at)}</span>
              <span className="flex-1 min-w-0 truncate">{p.method}</span>
              <span className="text-ink-faint text-[11px] hidden sm:inline truncate w-28">
                {p.reference ?? "—"}
              </span>
              <span className="w-24 shrink-0 text-right">
                {formatPrice(p.amount_minor, p.currency)}
              </span>
              <span
                className={`text-[11px] px-2 py-[2px] rounded-md w-20 text-center shrink-0 ${PAYOUT_BADGE[p.status]}`}
              >
                {p.status[0].toUpperCase() + p.status.slice(1)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Withdrawal details */}
      <p className="text-[13px] font-medium m-0 mb-2">Withdrawal account</p>
      <PayoutDetailsForm details={details} />
    </VendorShell>
  );
}
