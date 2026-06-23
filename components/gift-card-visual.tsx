import type { GiftDesign } from "@/lib/gift-designs";
import { giftGradient } from "@/lib/gift-designs";
import { LogoMark } from "@/components/logo";

/**
 * A premium, professional gift-card face: deep gradient, brand mark, fine
 * guilloché-style line texture, gold hairline divider and refined typography.
 * Pure presentational — safe in server and client components, and in print.
 */
export function GiftCardVisual({
  design,
  amountLabel,
  code,
  className = "",
}: {
  design: GiftDesign;
  amountLabel: string;
  code?: string;
  className?: string;
}) {
  return (
    <div
      className={`relative rounded-2xl overflow-hidden aspect-[1.586/1] text-white ${className}`}
      style={{ backgroundImage: giftGradient(design), containerType: "inline-size" }}
    >
      {/* subtle engraved line texture */}
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, #fff 0 1px, transparent 1px 11px)",
        }}
        aria-hidden
      />
      {/* corner sheen */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(120% 80% at 85% -20%, rgba(255,255,255,0.28), transparent 55%)" }}
        aria-hidden
      />
      {/* faint occasion glyph watermark */}
      <div className="absolute -right-3 -bottom-6 text-[120px] leading-none opacity-[0.07] select-none" aria-hidden>
        {design.emoji}
      </div>

      <div className="relative h-full w-full p-[6%] flex flex-col justify-between">
        {/* top row: brand + occasion */}
        <div className="flex items-start justify-between">
          <span className="inline-flex items-center gap-2">
            <LogoMark size={26} className="text-white drop-shadow-sm" />
            <span className="text-[15px] font-semibold tracking-tight">DoyinMart</span>
          </span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-white/70 mt-1">
            {design.label}
          </span>
        </div>

        {/* gold hairline */}
        <div
          className="h-px w-full my-1"
          style={{ background: "linear-gradient(90deg, transparent, rgba(234,205,140,0.85), transparent)" }}
          aria-hidden
        />

        {/* bottom: label + amount + code */}
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="m-0 text-[10px] uppercase tracking-[0.22em] text-white/65">Gift Card</p>
            <p className="m-0 text-[clamp(22px,7cqw,34px)] font-semibold leading-none">{amountLabel}</p>
            {code && <p className="m-0 mt-1.5 font-mono text-[12px] tracking-wider text-white/90 break-all">{code}</p>}
          </div>
          {/* faux chip */}
          <div
            className="w-10 h-7 rounded-[6px] shrink-0 border border-white/25"
            style={{ background: "linear-gradient(135deg, rgba(234,205,140,0.55), rgba(234,205,140,0.15))" }}
            aria-hidden
          />
        </div>
      </div>
    </div>
  );
}
