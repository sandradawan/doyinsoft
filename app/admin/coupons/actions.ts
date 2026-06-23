"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createCoupon, setCouponActive, deleteCoupon } from "@/lib/coupons";
import { parseCouponForm } from "@/lib/coupon-form";
import { logAudit } from "@/lib/audit";
import type { CreateState } from "@/components/coupon-manager";

export async function createPlatformCoupon(_: CreateState, fd: FormData): Promise<CreateState> {
  const admin = await requireAdmin();
  const p = parseCouponForm(fd);
  if (!Number.isFinite(p.discount_value)) return { error: "Enter a valid amount." };
  const res = await createCoupon({ ...p, vendorId: null });
  if (!res.ok) return { error: res.error };
  await logAudit(admin, "coupon.create", "coupon", undefined, p.code.toUpperCase());
  revalidatePath("/admin/coupons");
  return { success: `Platform code ${p.code.toUpperCase()} created.` };
}

export async function togglePlatformCoupon(fd: FormData) {
  await requireAdmin();
  await setCouponActive(String(fd.get("id")), null, String(fd.get("active")) === "1");
  revalidatePath("/admin/coupons");
}

export async function deletePlatformCoupon(fd: FormData) {
  const admin = await requireAdmin();
  await deleteCoupon(String(fd.get("id")), null);
  await logAudit(admin, "coupon.delete", "coupon", String(fd.get("id")));
  revalidatePath("/admin/coupons");
}
