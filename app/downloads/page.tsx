import Link from "next/link";
import { Download } from "lucide-react";
import { getLicensesByEmail } from "@/lib/data";
import { hasServiceRole } from "@/lib/supabase/env";

/**
 * Buyer's downloads. Looked up by email (no buyer login yet). Each row offers a
 * gated download that mints a fresh signed link on click.
 */
export default async function DownloadsPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  const licenses = email ? await getLicensesByEmail(email) : [];

  return (
    <main className="max-w-2xl mx-auto px-5 py-8">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-[22px] font-medium m-0">Your downloads</h1>
        <Link href="/" className="text-[13px] text-ink-soft no-underline hover:text-ink">
          ← Store
        </Link>
      </div>
      <p className="text-[13px] text-ink-soft m-0 mb-5">
        Enter the email you bought with to find your licenses and re-download.
      </p>

      <form method="get" className="flex gap-2 mb-6">
        <input
          name="email"
          type="email"
          required
          defaultValue={email ?? ""}
          placeholder="you@example.com"
          className="field flex-1"
        />
        <button type="submit" className="btn-primary px-4 py-2">
          Find
        </button>
      </form>

      {email && licenses.length === 0 && (
        <p className="text-[13px] text-ink-soft">
          No licenses found for {email}.
        </p>
      )}

      {licenses.length > 0 && (
        <div>
          {!hasServiceRole && (
            <p className="text-[11px] text-info bg-info-bg rounded-md px-3 py-2 mb-3">
              Demo data — connect Supabase to show licenses for this specific email.
            </p>
          )}
          {licenses.map((license) => (
            <div
              key={license.id}
              className="flex items-center gap-3 py-3 border-t border-line text-[13px]"
            >
              <div className="flex-1 min-w-0">
                <p className="m-0 font-medium">
                  {license.product.name}{" "}
                  <span className="text-ink-faint font-normal">
                    v{license.product.version}
                  </span>
                </p>
                <p className="m-0 text-[11px] text-ink-faint break-all">{license.key}</p>
              </div>
              <a
                href={`/api/download?key=${encodeURIComponent(license.key)}&order=${encodeURIComponent(license.order_id)}`}
                className="btn-primary inline-flex items-center gap-[6px] px-3 py-[6px] no-underline shrink-0"
              >
                <Download size={14} aria-hidden /> Download
              </a>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
