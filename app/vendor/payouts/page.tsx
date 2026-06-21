import { VendorShell } from "@/components/vendor-shell";
import { getPayouts, getPayoutSummary, getVendorSubaccount } from "@/lib/data";
import { requireVendor } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import { listPaystackBanks, PLATFORM_COMMISSION_PERCENT } from "@/lib/paystack";
import type { PayoutStatus } from "@/lib/types";
import { ConnectPayoutsForm } from "./payouts-client";

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
  const [summary, payouts, subaccount, banks] = await Promise.all([
    getPayoutSummary(vendor.id),
    getPayouts(vendor.id),
    getVendorSubaccount(vendor.id),
    listPaystackBanks(),
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
      <div className="grid [grid-template-columns:repeat(3,1fr)] gap-3 mb-3">
        {cards.map((c) => (
          <div key={c.label} className="bg-muted rounded-md p-4">
            <p className="text-[13px] text-ink-soft m-0 mb-[6px]">{c.label}</p>
            <p className="text-[22px] font-medium m-0">{c.value}</p>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-ink-faint mb-8">
        DoyinSoft keeps {PLATFORM_COMMISSION_PERCENT}% commission per sale. The rest is settled
        to your connected bank automatically by Paystack — no manual withdrawals needed.
      </p>

      {/* Payout account (Paystack subaccount) */}
      <p className="text-[13px] font-medium m-0 mb-1">Payout account</p>
      <p className="text-[12px] text-ink-soft m-0 mb-3">
        Connect the bank where your earnings should land.
      </p>
      <div className="mb-8">
        <ConnectPayoutsForm
          banks={banks}
          connected={subaccount.connected}
          accountNumber={subaccount.account_number}
          bankCode={subaccount.bank_code}
          commission={PLATFORM_COMMISSION_PERCENT}
        />
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
    </VendorShell>
  );
}
