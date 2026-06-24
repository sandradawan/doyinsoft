import Link from "next/link";
import {
  adminListGiftCards,
  adminGiftCardLiability,
  adminGiftCardRedeemed,
  adminGiftCardVendorOwed,
  adminListBatches,
} from "@/lib/giftcards";
import { PLATFORM_COMMISSION_PERCENT } from "@/lib/paystack";
import { GIFT_DESIGNS } from "@/lib/gift-designs";
import { toNgnCharge } from "@/lib/money";
import { formatPrice } from "@/lib/format";
import { toggleGiftCard, activateGiftCardAction, createGiftCardBatch } from "./actions";

function shortDate(iso: string): string {
  return iso ? new Date(iso).toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" }) : "—";
}

const BADGE: Record<string, string> = {
  active: "bg-success-bg text-success",
  inactive: "bg-info-bg text-info",
  depleted: "bg-muted text-ink-soft",
  disabled: "bg-info-bg text-info",
  expired: "bg-muted text-ink-faint",
};

export default async function AdminGiftCardsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const [cards, liability, redeemed, owed, batches] = await Promise.all([
    adminListGiftCards(100),
    adminGiftCardLiability(),
    adminGiftCardRedeemed(),
    adminGiftCardVendorOwed(),
    adminListBatches(),
  ]);
  const issued = cards.reduce((t, c) => t + toNgnCharge(c.initial_minor, c.currency), 0);

  return (
    <div>
      <h1 className="text-[22px] font-medium m-0 mb-1">Gift cards</h1>
      <p className="text-[13px] text-ink-soft m-0 mb-5">
        Outstanding balances are money the platform owes against future redemptions.
      </p>

      {error && (
        <p className="text-[13px] text-info bg-info-bg rounded-md px-3 py-2 mb-5">{error}</p>
      )}

      <div className="grid [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))] gap-4 mb-6">
        <div className="bg-brand-tint rounded-lg p-5">
          <p className="text-[14px] text-brand m-0 mb-2">Outstanding liability</p>
          <p className="text-[26px] font-medium text-brand m-0 leading-none">{formatPrice(liability, "NGN")}</p>
        </div>
        <div className="bg-muted rounded-lg p-5">
          <p className="text-[14px] text-ink-soft m-0 mb-2">Total issued</p>
          <p className="text-[26px] font-medium m-0 leading-none">{formatPrice(issued, "NGN")}</p>
        </div>
        <div className="bg-muted rounded-lg p-5">
          <p className="text-[14px] text-ink-soft m-0 mb-2">Redeemed at stores</p>
          <p className="text-[26px] font-medium m-0 leading-none">{formatPrice(redeemed, "NGN")}</p>
          <p className="text-[11px] text-ink-faint m-0 mt-1.5">owed to vendors from the float</p>
        </div>
        <div className="bg-muted rounded-lg p-5">
          <p className="text-[14px] text-ink-soft m-0 mb-2">Cards</p>
          <p className="text-[26px] font-medium m-0 leading-none">{cards.length}</p>
        </div>
      </div>

      {/* Per-vendor settlement owed from gift-card spend */}
      {owed.length > 0 && (
        <div className="border border-line rounded-lg p-4 mb-6">
          <p className="text-[14px] font-medium m-0 mb-1">Owed to vendors from gift cards</p>
          <p className="text-[12px] text-ink-soft m-0 mb-3">
            Paystack’s auto-split only covers the card-charged part of an order, so transfer each
            vendor their {100 - PLATFORM_COMMISSION_PERCENT}% share of the gift-card-funded part.
          </p>
          {owed.map((o) => (
            <div
              key={o.vendor}
              className="flex items-center justify-between py-2 border-t border-line text-[13px]"
            >
              <span className="text-ink">{o.vendor}</span>
              <span className="text-ink-faint text-[11px] ml-auto mr-3 hidden sm:inline">
                {formatPrice(o.gross_minor, "NGN")} redeemed
              </span>
              <span className="font-medium">{formatPrice(o.owed_minor, "NGN")}</span>
            </div>
          ))}
        </div>
      )}

      {/* Print physical cards for stores */}
      <form
        action={createGiftCardBatch}
        className="border border-line rounded-lg p-4 mb-6 flex flex-wrap items-end gap-3"
      >
        <div>
          <p className="text-[14px] font-medium m-0 mb-1">Print physical cards</p>
          <p className="text-[12px] text-ink-soft m-0">
            Generate a batch with codes + QR to print and distribute to stores.
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-end gap-2">
          <label className="block">
            <span className="block text-[11px] text-ink-faint mb-1">Quantity</span>
            <input name="count" type="number" min={1} max={200} defaultValue={20} className="field w-24" />
          </label>
          <label className="block">
            <span className="block text-[11px] text-ink-faint mb-1">Amount (₦)</span>
            <input name="amount" type="number" min={500} defaultValue={5000} className="field w-28" />
          </label>
          <label className="block">
            <span className="block text-[11px] text-ink-faint mb-1">Design</span>
            <select name="design" defaultValue="classic" className="field w-36">
              {GIFT_DESIGNS.map((d) => (
                <option key={d.key} value={d.key}>{d.label}</option>
              ))}
            </select>
          </label>
          <label className="inline-flex items-center gap-2 text-[12px] text-ink-soft mb-2">
            <input type="checkbox" name="active" value="1" /> Active now
          </label>
          <button className="btn-primary px-4 py-2">Generate &amp; print</button>
        </div>
      </form>
      <p className="text-[11px] text-ink-faint -mt-4 mb-6">
        Leave “Active now” off to print cards that a store activates on sale (safer against theft).
      </p>

      {/* Past print runs — re-print any time */}
      {batches.length > 0 && (
        <div className="border border-line rounded-lg p-4 mb-6">
          <p className="text-[14px] font-medium m-0 mb-2">Print runs</p>
          {batches.map((b) => (
            <div key={b.batch_ref} className="flex items-center gap-3 py-2 border-t border-line text-[13px]">
              <span>
                {b.count} × {formatPrice(b.amount_minor, "NGN")}
              </span>
              <span className="text-ink-faint text-[11px]">
                {b.active}/{b.count} active · {shortDate(b.created_at)}
              </span>
              <Link
                href={`/admin/gift-cards/print?batch=${b.batch_ref}`}
                className="ml-auto text-[12px] text-brand no-underline hover:underline"
              >
                Print →
              </Link>
            </div>
          ))}
        </div>
      )}

      {cards.length === 0 ? (
        <p className="text-[13px] text-ink-soft">No gift cards yet.</p>
      ) : (
        <div className="border border-line rounded-lg overflow-hidden">
          {cards.map((c, i) => (
            <div
              key={c.id}
              className={["flex items-center gap-3 px-4 py-3 text-[13px]", i > 0 ? "border-t border-line" : ""].join(" ")}
            >
              <span className="font-mono text-[12px]">{c.code}</span>
              <span className="text-ink-soft">
                {formatPrice(c.balance_minor, c.currency)}{" "}
                <span className="text-ink-faint">/ {formatPrice(c.initial_minor, c.currency)}</span>
              </span>
              <span className="ml-auto text-[11px] text-ink-faint hidden md:inline">{shortDate(c.created_at)}</span>
              <span className={`text-[11px] px-2 py-[2px] rounded-md w-16 text-center shrink-0 ${BADGE[c.status] ?? "bg-muted"}`}>
                {c.status}
              </span>
              {c.status === "inactive" && (
                <form action={activateGiftCardAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <button className="text-[11px] text-brand hover:underline border border-brand/30 rounded-md px-2 py-[3px] cursor-pointer">
                    Activate
                  </button>
                </form>
              )}
              {(c.status === "active" || c.status === "disabled") && (
                <form action={toggleGiftCard}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="disable" value={c.status === "active" ? "1" : "0"} />
                  <button className="text-[11px] text-ink-soft hover:text-ink border border-line rounded-md px-2 py-[3px] cursor-pointer">
                    {c.status === "active" ? "Disable" : "Enable"}
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
