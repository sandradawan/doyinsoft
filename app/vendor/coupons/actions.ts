"use server";

import { revalidatePath } from "next/cache";
import { requireVendor } from "@/lib/auth";
import { createCoupon, setCouponActive, deleteCoupon } from "@/lib/coupons";
import { parseCouponForm } from "@/lib/coupon-form";
import type { CreateState } from "@/components/coupon-manager";

export async function createVendorCoupon(_: CreateState, fd: FormData): Promise<CreateState> {
  const vendor = await requireVendor();
  const p = parseCouponForm(fd);
  if (!Number.isFinite(p.discount_value)) return { error: "Enter a valid amount." };
  const res = await createCoupon({ ...p, vendorId: vendor.id });
  if (!res.ok) return { error: res.error };
  revalidatePath("/vendor/coupons");
  return { success: `Code ${p.code.toUpperCase()} created.` };
}

export async function toggleVendorCoupon(fd: FormData) {
  const vendor = await requireVendor();
  await setCouponActive(String(fd.get("id")), vendor.id, String(fd.get("active")) === "1");
  revalidatePath("/vendor/coupons");
}

export async function deleteVendorCoupon(fd: FormData) {
  const vendor = await requireVendor();
  await deleteCoupon(String(fd.get("id")), vendor.id);
  revalidatePath("/vendor/coupons");
}
