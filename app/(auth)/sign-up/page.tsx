import Link from "next/link";
import { SignUpForm } from "./sign-up-form";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div>
      <h1 className="text-[22px] font-medium m-0 mb-1">Sell on DoyinSoft</h1>
      <p className="text-[13px] text-ink-soft m-0 mb-5">
        Create a vendor account to upload software and get paid.
      </p>

      <SignUpForm next={next ?? "/vendor/dashboard"} />

      <p className="text-[12px] text-ink-soft text-center mt-5 mb-0">
        Already selling?{" "}
        <Link href="/sign-in" className="text-brand no-underline hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
