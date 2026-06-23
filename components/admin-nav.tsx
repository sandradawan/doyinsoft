"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Folder,
  Users,
  File,
  Star,
  Tag,
  Ticket,
  Gift,
  ScrollText,
  Settings,
  Store,
  Coins,
} from "lucide-react";

const NAV = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard, match: (p: string) => p === "/admin" },
  { label: "Products", href: "/admin/products", icon: Folder, match: (p: string) => p.startsWith("/admin/products") },
  { label: "Orders", href: "/admin/orders", icon: File, match: (p: string) => p.startsWith("/admin/orders") },
  { label: "Vendors", href: "/admin/vendors", icon: Users, match: (p: string) => p.startsWith("/admin/vendors") },
  { label: "Affiliates", href: "/admin/affiliates", icon: Coins, match: (p: string) => p.startsWith("/admin/affiliates") },
  { label: "Reviews", href: "/admin/reviews", icon: Star, match: (p: string) => p.startsWith("/admin/reviews") },
  { label: "Coupons", href: "/admin/coupons", icon: Ticket, match: (p: string) => p.startsWith("/admin/coupons") },
  { label: "Gift cards", href: "/admin/gift-cards", icon: Gift, match: (p: string) => p.startsWith("/admin/gift-cards") },
  { label: "Categories", href: "/admin/categories", icon: Tag, match: (p: string) => p.startsWith("/admin/categories") },
  { label: "Audit log", href: "/admin/audit", icon: ScrollText, match: (p: string) => p.startsWith("/admin/audit") },
  { label: "Settings", href: "/admin/settings", icon: Settings, match: (p: string) => p.startsWith("/admin/settings") },
  { label: "Store", href: "/", icon: Store, match: () => false },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1.5">
      {NAV.map(({ label, href, icon: Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={label}
            href={href}
            className={[
              "flex items-center gap-3 text-[15px] px-4 py-3 rounded-lg no-underline whitespace-nowrap border transition-colors",
              active
                ? "bg-brand-tint font-semibold text-brand border-brand/25"
                : "text-ink-soft hover:text-ink hover:bg-muted border-transparent",
            ].join(" ")}
          >
            <Icon size={18} aria-hidden className="shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
