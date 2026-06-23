import { requireAdmin } from "@/lib/admin";
import { AdminNav } from "@/components/admin-nav";
import { DashboardHeader } from "@/components/dashboard-header";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const email = await requireAdmin();
  return (
    <main className="max-w-6xl mx-auto px-5 sm:px-6 py-7 text-[14px]">
      <DashboardHeader
        name="Administrator"
        email={email}
        initials={(email[0] ?? "A").toUpperCase()}
        role="Admin"
      />
      <div className="grid gap-7 [grid-template-columns:180px_minmax(0,1fr)]">
        <aside>
          <AdminNav />
        </aside>
        <div>{children}</div>
      </div>
    </main>
  );
}
