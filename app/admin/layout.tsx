import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { AdminNav } from "@/components/admin-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <main className="max-w-6xl mx-auto px-5 py-6">
      <div className="grid gap-6 [grid-template-columns:170px_minmax(0,1fr)]">
        <aside>
          <Link href="/admin" className="text-[16px] font-medium no-underline text-ink mb-5 inline-block">
            Doyin<span className="text-brand">Soft</span>{" "}
            <span className="text-[11px] text-ink-faint align-middle">admin</span>
          </Link>
          <AdminNav />
        </aside>
        <div>{children}</div>
      </div>
    </main>
  );
}
