import Link from "next/link";
import QRCode from "qrcode";
import { listGiftCardsByBatch } from "@/lib/giftcards";
import { giftDesign } from "@/lib/gift-designs";
import { GiftCardVisual } from "@/components/gift-card-visual";
import { formatPrice } from "@/lib/format";
import { PrintButton } from "./print-button";

export const metadata = { title: "Print gift cards — DoyinMart" };

async function qrFor(code: string): Promise<string> {
  try {
    return await QRCode.toString(code, {
      type: "svg",
      margin: 0,
      color: { dark: "#111111", light: "#ffffff" },
    });
  } catch {
    return "";
  }
}

export default async function PrintGiftCardsPage({
  searchParams,
}: {
  searchParams: Promise<{ batch?: string }>;
}) {
  const { batch } = await searchParams;
  const cards = batch ? await listGiftCardsByBatch(batch) : [];
  const qrs = await Promise.all(cards.map((c) => qrFor(c.code)));

  return (
    <div className="print-area">
      {/* Controls (hidden when printing) */}
      <div className="print-hide flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[20px] font-medium m-0">Print {cards.length} gift card{cards.length === 1 ? "" : "s"}</h1>
          <p className="text-[12px] text-ink-soft m-0">
            Print on card stock, cut along the cards, and distribute to stores.{" "}
            {cards[0]?.status === "inactive" && "Cards are inactive — activate each on sale."}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/gift-cards" className="border border-line rounded-md px-3 py-2 text-[13px] text-ink-soft no-underline hover:text-ink">
            ← Back
          </Link>
          <PrintButton />
        </div>
      </div>

      {cards.length === 0 ? (
        <p className="print-hide text-[13px] text-ink-soft">No cards in this batch.</p>
      ) : (
        <div className="gift-print-grid">
          {cards.map((c, i) => (
            <div key={c.id} className="gift-print-card">
              <div className="w-full max-w-[340px]">
                <GiftCardVisual design={giftDesign(c.design)} amountLabel={formatPrice(c.initial_minor, c.currency)} code={c.code} />
              </div>
              <div className="flex items-center gap-3 mt-2 max-w-[340px]">
                <div className="w-[58px] h-[58px] shrink-0 [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{ __html: qrs[i] }} />
                <p className="text-[10px] text-ink-soft leading-snug m-0">
                  Redeem at <strong>doyinmart.com</strong> — enter this code in the “Gift card” field at
                  checkout. {formatPrice(c.initial_minor, c.currency)} value. Non-refundable.
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
