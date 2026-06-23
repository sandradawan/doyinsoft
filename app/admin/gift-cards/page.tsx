import {
  adminListGiftCards,
  adminGiftCardLiability,
  adminGiftCardRedeemed,
  adminGiftCardVendorOwed,
} from "@/lib/giftcards";
import { PLATFORM_COMMISSION_PERCENT } from "@/lib/paystack";
import { formatPrice } from "@/lib/format";
import { toggleGiftCard } from "./actions";

function shortDate(iso: string): string {
  return iso ? new Date(iso).toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" }) : "—";
}

const BADGE: Record<string, string> = {
  active: "bg-success-bg text-success",
  depleted: "bg-muted text-ink-soft",
  disabled: "bg-info-bg text-info",
  expired: "bg-muted text-ink-faint",
};

export default async function AdminGiftCardsPage() {
  const [cards, liability, redeemed, owed] = await Promise.all([
    adminListGiftCards(100),
    adminGiftCardLiability(),
    adminGiftCardRedeemed(),
    adminGiftCardVendorOwed(),
  ]);
  const issued = cards.reduce((t, c) => t + c.initial_minor, 0);

  return (
    <div>
      <h1 className="text-[22px] font-medium m-0 mb-1">Gift cards</h1>
      <p className="text-[13px] text-ink-soft m-0 mb-5">
        Outstanding balances are money the platform owes against future redemptions.
      </p>

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
