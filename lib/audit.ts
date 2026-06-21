import "server-only";
import { createAdminClient } from "./supabase/admin";
import { hasServiceRole } from "./supabase/env";

export interface AuditEntry {
  id: string;
  admin_email: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  detail: string | null;
  created_at: string;
}

/** Record an admin action. Best-effort — never throws into the caller. */
export async function logAudit(
  adminEmail: string,
  action: string,
  targetType?: string,
  targetId?: string,
  detail?: string
): Promise<void> {
  if (!hasServiceRole) return;
  try {
    await createAdminClient().from("admin_audit").insert({
      admin_email: adminEmail,
      action,
      target_type: targetType ?? null,
      target_id: targetId ?? null,
      detail: detail ?? null,
    });
  } catch {
    // ignore audit failures
  }
}

export async function getAuditLog(limit = 100): Promise<AuditEntry[]> {
  if (!hasServiceRole) return [];
  const { data } = await createAdminClient()
    .from("admin_audit")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as AuditEntry[]) ?? [];
}
