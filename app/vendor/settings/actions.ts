"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getCurrentVendor } from "@/lib/auth";
import { initialsOf } from "@/lib/format";

export interface SettingsState {
  error?: string;
  success?: string;
}

export async function updateVendor(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  if (!isSupabaseConfigured) {
    return { error: "Connect Supabase to edit your vendor profile." };
  }
  const vendor = await getCurrentVendor();
  if (!vendor) return { error: "Please sign in first." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Business / vendor name is required." };

  const initialsInput = String(formData.get("initials") ?? "").trim().toUpperCase();
  const initials = (initialsInput || initialsOf(name) || "V").slice(0, 2);

  const supabase = await createClient();
  const { error } = await supabase
    .from("vendors")
    .update({ name, initials })
    .eq("id", vendor.id);
  if (error) return { error: error.message };

  revalidatePath("/vendor/settings");
  revalidatePath("/vendor/dashboard");
  return { success: "Profile updated." };
}
