import { getSettings } from "@/lib/settings";
import { SettingsForm } from "./settings-form";

export default async function AdminSettingsPage() {
  const s = await getSettings();
  return (
    <div>
      <h1 className="text-[22px] font-medium m-0 mb-1">Settings</h1>
      <p className="text-[13px] text-ink-soft m-0 mb-5">Platform-wide configuration.</p>
      <SettingsForm commission={s.commission_percent} usd={s.usd_to_ngn} />
    </div>
  );
}
