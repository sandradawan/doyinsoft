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

  const whatsapp = String(formData.get("whatsapp") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const coverUrl = String(formData.get("cover_url") ?? "").trim(); // only set when newly uploaded

  const base = { name, initials, whatsapp: whatsapp || null };
  const supabase = await createClient();
  const { error } = await supabase
    .from("vendors")
    .update({ ...base, bio: bio || null, ...(coverUrl ? { cover_url: coverUrl } : {}) })
    .eq("id", vendor.id);

  // bio/cover_url may not exist yet (migration pending) — retry core fields only.
  if (error) {
    const r = await supabase.from("vendors").update(base).eq("id", vendor.id);
    if (r.error) return { error: r.error.message };
    return { success: "Profile updated. (Run migration 0016 to enable store bio/cover.)" };
  }

  revalidatePath("/vendor/settings");
  revalidatePath("/vendor/dashboard");
  revalidatePath(`/store/${vendor.slug}`);
  return { success: "Profile updated." };
}
