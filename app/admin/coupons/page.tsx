import { listCoupons, couponLabel } from "@/lib/coupons";
import { CouponManager, type CouponView } from "@/components/coupon-manager";
import { createPlatformCoupon, togglePlatformCoupon, deletePlatformCoupon } from "./actions";

function fmtDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-NG", { day: "2-digit", month: "short" });
}

export default async function AdminCouponsPage() {
  const coupons = await listCoupons(null); // platform-wide
  const now = Date.now();

  const views: CouponView[] = coupons.map((c) => ({
    id: c.id,
    code: c.code,
    label: couponLabel(c),
    active: c.active,
    used_count: c.used_count,
    max_uses: c.max_uses,
    expires: fmtDate(c.expires_at),
    expired: !!c.expires_at && new Date(c.expires_at).getTime() < now,
  }));

  return (
    <CouponManager
      coupons={views}
      scopeNote="Platform-wide promo codes — these work on any product across the marketplace."
      createAction={createPlatformCoupon}
      toggleAction={togglePlatformCoupon}
      deleteAction={deletePlatformCoupon}
    />
  );
}
