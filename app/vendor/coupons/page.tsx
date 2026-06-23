import { VendorShell } from "@/components/vendor-shell";
import { requireVendor } from "@/lib/auth";
import { listCoupons, couponLabel } from "@/lib/coupons";
import { CouponManager, type CouponView } from "@/components/coupon-manager";
import { createVendorCoupon, toggleVendorCoupon, deleteVendorCoupon } from "./actions";

function fmtDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-NG", { day: "2-digit", month: "short" });
}

export default async function VendorCouponsPage() {
  const vendor = await requireVendor();
  const coupons = await listCoupons(vendor.id);
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
    <VendorShell active="coupons">
      <CouponManager
        coupons={views}
        scopeNote="Discount codes buyers apply at checkout. These work only on your own products."
        createAction={createVendorCoupon}
        toggleAction={toggleVendorCoupon}
        deleteAction={deleteVendorCoupon}
      />
    </VendorShell>
  );
}
