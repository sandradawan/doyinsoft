import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-5 py-10">
      <div className="mb-6">
        <Logo size={32} textClassName="text-[18px]" />
      </div>
      <div className="w-full max-w-[360px] border border-line rounded-lg p-6">
        {children}
      </div>
    </main>
  );
}
