import Link from "next/link";
import { RegisterForm } from "./register-form";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div>
      <h1 className="text-[22px] font-medium m-0 mb-1">Create your account</h1>
      <p className="text-[13px] text-ink-soft m-0 mb-5">
        Buy software, keep your licenses & downloads in one place.
      </p>

      <RegisterForm next={next ?? "/account"} />

      <p className="text-[12px] text-ink-soft text-center mt-5 mb-0">
        Already have an account?{" "}
        <Link href="/sign-in" className="text-brand no-underline hover:underline">
          Sign in
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
