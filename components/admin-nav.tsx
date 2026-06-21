"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Folder, Users, Store } from "lucide-react";

const NAV = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard, match: (p: string) => p === "/admin" },
  { label: "Products", href: "/admin/products", icon: Folder, match: (p: string) => p.startsWith("/admin/products") },
  { label: "Vendors", href: "/admin/vendors", icon: Users, match: (p: string) => p.startsWith("/admin/vendors") },
  { label: "Store", href: "/", icon: Store, match: () => false },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ label, href, icon: Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={label}
            href={href}
            className={[
              "flex items-center gap-2 text-[13px] px-[10px] py-2 rounded-md no-underline",
              active ? "bg-brand-tint font-medium text-brand" : "text-ink-soft hover:text-ink",
            ].join(" ")}
          >
            <Icon size={14} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
