import type { DiscountType } from "./coupons";

/** Parse the create-coupon form into a CreateCouponInput (fixed amounts: naira → kobo). */
export function parseCouponForm(fd: FormData) {
  const type: DiscountType = (fd.get("discount_type") as string) === "fixed" ? "fixed" : "percent";
  const rawValue = Number(fd.get("discount_value"));
  const maxRaw = Number(fd.get("max_uses"));
  const exp = ((fd.get("expires_at") as string) || "").trim();
  return {
    code: (fd.get("code") as string) ?? "",
    discount_type: type,
    discount_value: type === "fixed" ? Math.round(rawValue * 100) : Math.round(rawValue),
    max_uses: Number.isFinite(maxRaw) && maxRaw > 0 ? Math.floor(maxRaw) : null,
    expires_at: exp ? new Date(`${exp}T23:59:59`).toISOString() : null,
  };
}
