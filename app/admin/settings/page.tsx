import { getSettings } from "@/lib/settings";
import { isEmailConfigured } from "@/lib/email";
import { SettingsForm } from "./settings-form";
import { TestEmail } from "./test-email";

export default async function AdminSettingsPage() {
  const s = await getSettings();
  return (
    <div>
      <h1 className="text-[22px] font-medium m-0 mb-1">Settings</h1>
      <p className="text-[13px] text-ink-soft m-0 mb-5">Platform-wide configuration.</p>
      <SettingsForm
        commission={s.commission_percent}
        usd={s.usd_to_ngn}
        affiliate={s.affiliate_percent}
      />

      <div className="mt-8 pt-6 border-t border-line max-w-sm">
        <p className="text-[13px] font-medium m-0 mb-1">Email</p>
        <p className="text-[12px] text-ink-soft m-0 mb-3">
          Verify transactional email (receipts, license keys, alerts) works here.
        </p>
        <TestEmail configured={isEmailConfigured} />
      </div>
    </div>
  );
}
