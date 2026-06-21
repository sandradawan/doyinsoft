import { BadgeCheck } from "lucide-react";
import { adminVendors } from "@/lib/data";
import { toggleSuspended, toggleVerified } from "../actions";

export default async function AdminVendorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const vendors = await adminVendors(q);

  return (
    <div>
      <h1 className="text-[22px] font-medium m-0 mb-4">Vendors</h1>

      <form method="get" className="flex gap-2 mb-5 max-w-sm">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search vendors by name…"
          className="field flex-1"
        />
        <button className="btn-primary px-4 py-2">Search</button>
      </form>

      {vendors.length === 0 ? (
        <p className="text-[13px] text-ink-soft">No vendors yet.</p>
      ) : (
        <div>
          {vendors.map((v) => (
            <div
              key={v.id}
              className="flex items-center gap-3 py-3 border-t border-line text-[13px]"
            >
              <div className="w-8 h-8 rounded-full bg-info-bg flex items-center justify-center text-[12px] font-medium text-info shrink-0">
                {v.initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="m-0 font-medium inline-flex items-center gap-1">
                  {v.name}
                  {v.verified && <BadgeCheck size={13} className="text-success" />}
                  {v.suspended && (
                    <span className="text-[11px] text-info bg-info-bg px-2 py-[1px] rounded-md">
                      suspended
                    </span>
                  )}
                </p>
                <p className="m-0 text-[11px] text-ink-faint">/{v.slug}</p>
              </div>
              <form action={toggleVerified}>
                <input type="hidden" name="id" value={v.id} />
                <input type="hidden" name="verified" value={String(v.verified)} />
                <button
                  className={[
                    "text-[12px] rounded-md px-3 py-[6px] border cursor-pointer",
                    v.verified
                      ? "border-line text-ink-soft bg-transparent hover:border-line-strong"
                      : "border-brand text-brand bg-brand-tint",
                  ].join(" ")}
                >
                  {v.verified ? "Unverify" : "Verify"}
                </button>
              </form>
              <form action={toggleSuspended}>
                <input type="hidden" name="id" value={v.id} />
                <input type="hidden" name="suspended" value={String(v.suspended ?? false)} />
                <button
                  className="text-[12px] rounded-md px-3 py-[6px] border border-line text-ink-soft bg-transparent cursor-pointer hover:border-line-strong"
                >
                  {v.suspended ? "Unban" : "Ban"}
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
