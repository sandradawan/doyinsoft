import Link from "next/link";
import { Logo } from "@/components/logo";
import { getCurrentUser, getCurrentVendor } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { signOut } from "@/app/(auth)/actions";

/**
 * Storefront top nav — wordmark, search, text links, and an auth-aware action
 * area: vendors see Dashboard, buyers see Account, guests see sign in / up.
 */
export async function TopNav({ defaultQuery = "" }: { defaultQuery?: string }) {
  const [vendor, admin, user] = await Promise.all([
    getCurrentVendor(),
    isAdmin(),
    getCurrentUser(),
  ]);

  return (
    <header className="flex items-center gap-4 border-b border-line pb-[14px] mb-5">
      <Logo />

      <form action="/" method="get" className="flex-1 max-w-[320px]">
        <input
          name="q"
          defaultValue={defaultQuery}
          className="field w-full"
          placeholder="Search products..."
          aria-label="Search products"
        />
      </form>

      <Link
        href="/launches"
        className="hidden sm:inline text-[13px] text-ink-soft no-underline hover:text-ink"
      >
        Launches
      </Link>
      <Link
        href="/downloads"
        className="hidden sm:inline text-[13px] text-ink-soft no-underline hover:text-ink"
      >
        Downloads
      </Link>
      <Link
        href="/gift-cards"
        className="hidden sm:inline text-[13px] text-ink-soft no-underline hover:text-ink"
      >
        Gift cards
      </Link>
      {admin && (
        <Link
          href="/admin"
          className="hidden sm:inline text-[13px] text-brand no-underline hover:underline"
        >
          Admin
        </Link>
      )}

      {vendor || user ? (
        <div className="flex items-center gap-3 ml-auto sm:ml-0">
          <Link
            href={vendor ? "/vendor/dashboard" : "/account"}
            className="hidden sm:inline text-[13px] text-ink-soft no-underline hover:text-ink"
          >
            {vendor ? "Dashboard" : "Account"}
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
            Sell on DoyinMart
          </Link>
          <Link href="/sign-in" className="btn-primary px-[14px] py-[6px] no-underline">
            Sign in
          </Link>
        </div>
      )}
    </header>
  );
}
