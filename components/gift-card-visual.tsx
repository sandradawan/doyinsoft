import type { GiftDesign } from "@/lib/gift-designs";
import { giftGradient } from "@/lib/gift-designs";

/**
 * A premium-looking gift-card face (gradient + chip + amount). Pure presentational
 * — safe in both server and client components.
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
      className={`relative rounded-2xl p-5 text-white overflow-hidden shadow-sm aspect-[1.6/1] flex flex-col justify-between ${className}`}
      style={{ backgroundImage: giftGradient(design) }}
    >
      {/* sheen */}
      <div
        className="absolute inset-0 opacity-20"
        style={{ background: "radial-gradient(circle at 80% -10%, #fff, transparent 45%)" }}
        aria-hidden
      />
      <div className="relative flex items-center justify-between">
        <span className="text-[14px] font-semibold tracking-tight">DoyinMart</span>
        <span className="text-[22px] leading-none">{design.emoji}</span>
      </div>

      <div className="relative">
        {/* faux chip */}
        <div className="w-9 h-6 rounded-[5px] bg-white/30 mb-3" aria-hidden />
        <p className="m-0 text-[11px] uppercase tracking-wide text-white/70">{design.label} gift card</p>
        <p className="m-0 text-[28px] font-semibold leading-tight">{amountLabel}</p>
        {code && <p className="m-0 mt-1 font-mono text-[12px] text-white/85 break-all">{code}</p>}
      </div>
    </div>
  );
}
