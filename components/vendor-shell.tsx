import Link from "next/link";
import { BarChart3, Folder, File, Banknote, Settings, Ticket } from "lucide-react";

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
 * Shared vendor layout: 140px sidebar + flexible main area, per the spec.
 * `active` highlights the current nav item (bg-muted, medium weight).
 */
export function VendorShell({
  active,
  children,
}: {
  active: NavKey;
  children: React.ReactNode;
}) {
  return (
    <main className="max-w-5xl mx-auto px-5 py-6">
      <div className="grid gap-5 [grid-template-columns:140px_minmax(0,1fr)]">
        <nav className="flex flex-col gap-1">
          {NAV.map(({ key, label, href, icon: Icon }) => {
            const isActive = key === active;
            return (
              <Link
                key={key}
                href={href}
                className={[
                  "flex items-center gap-2 text-[13px] px-[10px] py-2 rounded-md no-underline",
                  isActive
                    ? "bg-brand-tint font-medium text-brand"
                    : "text-ink-soft hover:text-ink",
                ].join(" ")}
              >
                <Icon size={14} aria-hidden />
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
