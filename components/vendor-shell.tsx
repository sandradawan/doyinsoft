import Link from "next/link";
import { BarChart3, Folder, File, Banknote, Settings, Ticket } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard-header";
import { getCurrentVendor } from "@/lib/auth";
import { initialsOf } from "@/lib/format";

type NavKey = "overview" | "products" | "orders" | "coupons" | "payouts" | "settings";

const NAV: { key: NavKey; label: string; href: string; icon: typeof BarChart3 }[] = [
  { key: "overview", label: "Overview", href: "/vendor/dashboard", icon: BarChart3 },
  { key: "products", label: "Products", href: "/vendor/products", icon: Folder },
  { key: "orders", label: "Orders", href: "/vendor/orders", icon: File },
  { key: "coupons", label: "Coupons", href: "/vendor/coupons", icon: Ticket },
  { key: "payouts", label: "Payouts", href: "/vendor/payouts", icon: Banknote },
  { key: "settings", label: "Settings", href: "/vendor/settings", icon: Settings },
];

/**
 * Shared vendor layout: header (profile + theme + logout) over a sidebar + main
 * area. `active` highlights the current nav item.
 */
export async function VendorShell({
  active,
  children,
}: {
  active: NavKey;
  children: React.ReactNode;
}) {
  const vendor = await getCurrentVendor();
  const name = vendor?.name ?? "Vendor";

  return (
    <main className="max-w-6xl mx-auto px-5 sm:px-6 py-7 text-[14px]">
      <DashboardHeader
        name={name}
        email={vendor?.email ?? ""}
        initials={vendor?.initials || initialsOf(name)}
        role="Seller"
      />

      <div className="grid gap-7 [grid-template-columns:170px_minmax(0,1fr)]">
        <nav className="flex flex-col gap-1">
          {NAV.map(({ key, label, href, icon: Icon }) => {
            const isActive = key === active;
            return (
              <Link
                key={key}
                href={href}
                className={[
                  "flex items-center gap-2.5 text-[14px] px-3 py-2.5 rounded-md no-underline",
                  isActive
                    ? "bg-brand-tint font-medium text-brand"
                    : "text-ink-soft hover:text-ink hover:bg-muted",
                ].join(" ")}
              >
                <Icon size={16} aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>

        <div>{children}</div>
      </div>
    </main>
  );
}
