import Link from "next/link";
import { SignInForm } from "./sign-in-form";

const NOTICES: Record<string, string> = {
  "confirm-email": "Check your email to confirm your account, then sign in.",
  "auth-error": "That sign-in link was invalid or expired. Try again.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; notice?: string }>;
}) {
  const { next, notice } = await searchParams;
  const noticeText = notice ? NOTICES[notice] : undefined;

  return (
    <div>
      <h1 className="text-[22px] font-medium m-0 mb-1">Sign in</h1>
      <p className="text-[13px] text-ink-soft m-0 mb-5">
        Manage your products, orders and payouts.
      </p>

      {noticeText && (
        <p className="text-[12px] text-success bg-success-bg rounded-md px-3 py-2 mb-4">
          {noticeText}
        </p>
      )}

      <SignInForm next={next ?? "/vendor/dashboard"} />

      <p className="text-[12px] text-ink-soft text-center mt-5 mb-0">
        New here?{" "}
        <Link href="/register" className="text-brand no-underline hover:underline">
          Create an account
        </Link>
      </p>
      <p className="text-[12px] text-ink-soft text-center mt-2 mb-0">
        Want to sell?{" "}
        <Link href="/sign-up" className="text-brand no-underline hover:underline">
          Become a vendor
        </Link>
      </p>
    </div>
  );
}
