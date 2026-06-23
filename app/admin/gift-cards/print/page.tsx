import Link from "next/link";
import QRCode from "qrcode";
import { listGiftCardsByBatch } from "@/lib/giftcards";
import { giftDesign } from "@/lib/gift-designs";
import { GiftCardVisual } from "@/components/gift-card-visual";
import { formatPrice } from "@/lib/format";
import { PrintButton } from "./print-button";

export const metadata = { title: "Print gift cards — DoyinMart" };

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

async function qrFor(value: string): Promise<string> {
  try {
    return await QRCode.toString(value, {
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
  const actQrs = await Promise.all(
    cards.map((c) => (c.activation_token ? qrFor(`${SITE_URL}/activate/${c.activation_token}`) : Promise.resolve("")))
  );

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
        <>
        <div className="gift-print-grid">
          {cards.map((c, i) => (
            <div key={c.id} className="gift-print-card">
              {/* Front: design + amount, NO code visible */}
              <div className="w-full max-w-[340px]">
                <GiftCardVisual
                  design={giftDesign(c.design)}
                  amountLabel={formatPrice(c.initial_minor, c.currency)}
                />
              </div>

              {/* Visible activation QR (NOT secret) — a store scans it to
                  activate the card on sale, no admin panel needed. */}
              {c.status === "inactive" && actQrs[i] && (
                <div className="flex items-center gap-2 mt-2 max-w-[340px] border border-line rounded-md px-2 py-1.5">
                  <div
                    className="w-[42px] h-[42px] shrink-0 [&>svg]:w-full [&>svg]:h-full"
                    dangerouslySetInnerHTML={{ __html: actQrs[i] }}
                  />
                  <p className="text-[9px] uppercase tracking-wider text-ink-soft m-0 leading-snug">
                    Store: scan to activate on sale
                  </p>
                </div>
              )}

              {/* Sealed panel: cover this with a scratch-off label. Holds the
                  code + QR — the only place the secret appears. */}
              <div className="scratch-zone max-w-[340px]">
                <p className="scratch-caption">🔒 SCRATCH TO REVEAL CODE</p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-[56px] h-[56px] shrink-0 bg-white p-[3px] rounded [&>svg]:w-full [&>svg]:h-full"
                    dangerouslySetInnerHTML={{ __html: qrs[i] }}
                  />
                  <p className="font-mono text-[14px] font-semibold tracking-wider text-[#1f2937] m-0 break-all">
                    {c.code}
                  </p>
                </div>
              </div>

              <p className="text-[10px] text-ink-soft leading-snug m-0 max-w-[340px] mt-1.5">
                Redeem at <strong>doyinmart.com</strong> — scratch the panel, then enter the code (or
                scan the QR) in the “Gift card” field at checkout. {formatPrice(c.initial_minor, c.currency)}{" "}
                value · non-refundable.
              </p>
            </div>
          ))}
        </div>

        <p className="print-hide text-[12px] text-ink-soft mt-6">
          Tip: after printing, cover each <strong>silver panel</strong> with a scratch-off
          sticker/label so the code stays hidden until the buyer scratches it.
        </p>
        </>
      )}
    </div>
  );
}
