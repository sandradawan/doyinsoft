import Link from "next/link";
import { requireAdmin } from "@/lib/admin";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <main className="max-w-5xl mx-auto px-5 py-6">
      <div className="flex items-center justify-between border-b border-line pb-3 mb-5">
        <Link href="/admin" className="text-[16px] font-medium no-underline text-ink">
          DoyinSoft <span className="text-brand">admin</span>
        </Link>
        <nav className="flex gap-4 text-[13px]">
          <Link href="/admin" className="text-ink-soft no-underline hover:text-ink">
            Overview
          </Link>
          <Link href="/admin/products" className="text-ink-soft no-underline hover:text-ink">
            Products
          </Link>
          <Link href="/admin/vendors" className="text-ink-soft no-underline hover:text-ink">
            Vendors
          </Link>
          <Link href="/" className="text-ink-soft no-underline hover:text-ink">
            Store
          </Link>
        </nav>
      </div>
      {children}
    </main>
  );
}
