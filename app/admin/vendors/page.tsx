import { BadgeCheck } from "lucide-react";
import { adminVendors } from "@/lib/data";
import { toggleVerified } from "../actions";

export default async function AdminVendorsPage() {
  const vendors = await adminVendors();

  return (
    <div>
      <h1 className="text-[22px] font-medium m-0 mb-4">Vendors</h1>

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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
