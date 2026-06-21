import Link from "next/link";
import { Download } from "lucide-react";
import { Logo } from "@/components/logo";
import { requireUser } from "@/lib/auth";
import { getCurrentVendor } from "@/lib/auth";
import { getLicensesByEmail } from "@/lib/data";

export const metadata = { title: "Your account — DoyinSoft" };

export default async function AccountPage() {
  const user = await requireUser("/account");
  const [licenses, vendor] = await Promise.all([
    getLicensesByEmail(user.email),
    getCurrentVendor(),
  ]);

  return (
    <main className="max-w-2xl mx-auto px-5 py-8">
      <div className="flex items-center justify-between mb-6">
        <Logo />
        <Link href="/" className="text-[13px] text-ink-soft no-underline hover:text-ink">
          ← Store
        </Link>
      </div>

      <h1 className="text-[22px] font-medium m-0 mb-1">Your account</h1>
      <p className="text-[13px] text-ink-soft m-0 mb-6">{user.email}</p>

      {/* Quick links */}
      <div className="flex flex-wrap gap-2 mb-8">
        <Link href="/affiliate" className="text-[13px] border border-line rounded-md px-3 py-2 no-underline text-ink-soft hover:border-brand hover:text-brand">
          Earn (affiliate)
        </Link>
        {vendor ? (
          <Link href="/vendor/dashboard" className="text-[13px] border border-line rounded-md px-3 py-2 no-underline text-ink-soft hover:border-brand hover:text-brand">
            Vendor dashboard
          </Link>
        ) : (
          <Link href="/sign-up" className="text-[13px] border border-line rounded-md px-3 py-2 no-underline text-ink-soft hover:border-brand hover:text-brand">
            Become a vendor
          </Link>
        )}
      </div>

      <p className="text-[13px] font-medium m-0 mb-2">Your purchases</p>
      {licenses.length === 0 ? (
        <p className="text-[13px] text-ink-soft">
          No purchases yet.{" "}
          <Link href="/" className="text-brand no-underline hover:underline">
            Browse software
          </Link>
          .
        </p>
      ) : (
        <div>
          {licenses.map((license) => (
            <div
              key={license.id}
              className="flex items-center gap-3 py-3 border-t border-line text-[13px]"
            >
              <div className="flex-1 min-w-0">
                <p className="m-0 font-medium">
                  {license.product.name}{" "}
                  <span className="text-ink-faint font-normal">v{license.product.version}</span>
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
