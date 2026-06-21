import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-5 py-10">
      <Link href="/" className="text-[16px] font-medium text-ink no-underline mb-6">
        DoyinSoft
      </Link>
      <div className="w-full max-w-[360px] border border-line rounded-lg p-6">
        {children}
      </div>
    </main>
  );
}
