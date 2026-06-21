import Link from "next/link";
import { Logo } from "@/components/logo";
import { getCurrentVendor } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { signOut } from "@/app/(auth)/actions";

/**
 * Storefront top nav — wordmark, search, text links, and an auth-aware action
 * area: signed-in vendors see their name + sign out; guests see sign in / up.
 */
export async function TopNav({ defaultQuery = "" }: { defaultQuery?: string }) {
  const [vendor, admin] = await Promise.all([getCurrentVendor(), isAdmin()]);

  return (
    <header className="flex items-center gap-4 border-b border-line pb-[14px] mb-5">
      <Logo />

      <form action="/" method="get" className="flex-1 max-w-[320px]">
        <input
          name="q"
          defaultValue={defaultQuery}
          className="field w-full"
          placeholder="Search software..."
          aria-label="Search software"
        />
      </form>

      <Link
        href="/"
        className="hidden sm:inline text-[13px] text-ink-soft no-underline hover:text-ink"
      >
        Categories
      </Link>
      <Link
        href="/downloads"
        className="hidden sm:inline text-[13px] text-ink-soft no-underline hover:text-ink"
      >
        Downloads
      </Link>
      {admin && (
        <Link
          href="/admin"
          className="hidden sm:inline text-[13px] text-brand no-underline hover:underline"
        >
          Admin
        </Link>
      )}

      {vendor ? (
        <div className="flex items-center gap-3 ml-auto sm:ml-0">
          <Link
            href="/vendor/dashboard"
            className="hidden sm:inline text-[13px] text-ink-soft no-underline hover:text-ink"
          >
            Dashboard
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="text-[13px] text-ink-soft hover:text-ink bg-transparent border-0 cursor-pointer p-0"
            >
              Sign out
            </button>
          </form>
        </div>
      ) : (
        <div className="flex items-center gap-3 ml-auto sm:ml-0">
          <Link
            href="/sign-up"
            className="hidden sm:inline text-[13px] text-ink-soft no-underline hover:text-ink"
          >
            Sell on DoyinSoft
          </Link>
          <Link href="/sign-in" className="btn-primary px-[14px] py-[6px] no-underline">
            Sign in
          </Link>
        </div>
      )}
    </header>
  );
}
