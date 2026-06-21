import { getAuditLog } from "@/lib/audit";

function when(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-NG", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminAuditPage() {
  const entries = await getAuditLog();

  return (
    <div>
      <h1 className="text-[22px] font-medium m-0 mb-4">Audit log</h1>

      {entries.length === 0 ? (
        <p className="text-[13px] text-ink-soft">No admin actions recorded yet.</p>
      ) : (
        <div>
          <div className="flex items-center gap-3 pb-2 text-[11px] text-ink-faint">
            <span className="w-28 shrink-0">When</span>
            <span className="w-40 shrink-0">Admin</span>
            <span className="flex-1">Action</span>
          </div>
          {entries.map((e) => (
            <div
              key={e.id}
              className="flex items-center gap-3 py-2 border-t border-line text-[12px]"
            >
              <span className="w-28 shrink-0 text-ink-faint">{when(e.created_at)}</span>
              <span className="w-40 shrink-0 text-ink-soft truncate">{e.admin_email}</span>
              <span className="flex-1 min-w-0">
                <span className="font-medium">{e.action}</span>
                {e.target_type && (
                  <span className="text-ink-faint"> · {e.target_type}:{(e.target_id ?? "").slice(0, 8)}</span>
                )}
                {e.detail && <span className="text-ink-faint"> · {e.detail}</span>}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
