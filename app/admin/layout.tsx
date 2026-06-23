import { requireAdmin } from "@/lib/admin";
import { AdminNav } from "@/components/admin-nav";
import { DashboardHeader } from "@/components/dashboard-header";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const email = await requireAdmin();
  return (
    <main className="max-w-6xl mx-auto px-5 sm:px-6 py-7 text-[14px]">
      <div className="print-hide">
        <DashboardHeader
          name="Administrator"
          email={email}
          initials={(email[0] ?? "A").toUpperCase()}
          role="Admin"
        />
      </div>
      <div className="admin-shell-grid grid gap-8 [grid-template-columns:208px_minmax(0,1fr)]">
        <aside className="print-hide">
          <AdminNav />
        </aside>
        <div>{children}</div>
      </div>
    </main>
  );
}
