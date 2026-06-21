import { BadgeCheck } from "lucide-react";
import { VendorShell } from "@/components/vendor-shell";
import { requireVendor } from "@/lib/auth";
import { SettingsForm } from "./settings-form";

export default async function VendorSettingsPage() {
  const vendor = await requireVendor();

  return (
    <VendorShell active="settings">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[13px] font-medium m-0">Settings</p>
        {vendor.verified ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-success bg-success-bg px-2 py-[2px] rounded-md">
            <BadgeCheck size={12} aria-hidden /> Verified vendor
          </span>
        ) : (
          <span className="text-[11px] text-ink-soft bg-muted px-2 py-[2px] rounded-md">
            Not yet verified
          </span>
        )}
      </div>
      <p className="text-[13px] text-ink-soft m-0 mb-5">
        Your public vendor profile.
      </p>

      {vendor.isDemo && (
        <p className="text-[12px] text-info bg-info-bg rounded-md px-3 py-2 mb-4">
          Demo mode — connect Supabase and sign in to edit a real profile.
        </p>
      )}

      <SettingsForm vendor={vendor} />
    </VendorShell>
  );
}
