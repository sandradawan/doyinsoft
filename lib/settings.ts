import "server-only";
import { createAdminClient } from "./supabase/admin";
import { hasServiceRole } from "./supabase/env";

const ENV_COMMISSION = Number(process.env.PLATFORM_COMMISSION_PERCENT ?? "") || 15;
const ENV_USD = Number(process.env.NEXT_PUBLIC_USD_TO_NGN ?? "") || 1600;
const ENV_AFFILIATE = Number(process.env.AFFILIATE_PERCENT ?? "") || 10;

export interface Settings {
  commission_percent: number;
  usd_to_ngn: number;
  affiliate_percent: number;
}

/** Platform settings from the DB, falling back to env defaults. */
export async function getSettings(): Promise<Settings> {
  if (!hasServiceRole) {
    return { commission_percent: ENV_COMMISSION, usd_to_ngn: ENV_USD, affiliate_percent: ENV_AFFILIATE };
  }
  try {
    const { data } = await createAdminClient().from("settings").select("key, value");
    const map = new Map(((data as { key: string; value: string }[]) ?? []).map((r) => [r.key, r.value]));
    return {
      commission_percent: Number(map.get("commission_percent")) || ENV_COMMISSION,
      usd_to_ngn: Number(map.get("usd_to_ngn")) || ENV_USD,
      affiliate_percent: Number(map.get("affiliate_percent")) || ENV_AFFILIATE,
    };
  } catch {
    return { commission_percent: ENV_COMMISSION, usd_to_ngn: ENV_USD, affiliate_percent: ENV_AFFILIATE };
  }
}

export async function saveSettings(s: Partial<Settings>): Promise<void> {
  if (!hasServiceRole) return;
  const rows: { key: string; value: string }[] = [];
  if (s.commission_percent != null)
    rows.push({ key: "commission_percent", value: String(s.commission_percent) });
  if (s.usd_to_ngn != null) rows.push({ key: "usd_to_ngn", value: String(s.usd_to_ngn) });
  if (s.affiliate_percent != null)
    rows.push({ key: "affiliate_percent", value: String(s.affiliate_percent) });
  if (rows.length) await createAdminClient().from("settings").upsert(rows);
}
