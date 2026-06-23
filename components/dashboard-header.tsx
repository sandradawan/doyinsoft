import Link from "next/link";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { signOut } from "@/app/(auth)/actions";

/**
 * Shared header for the dashboards: wordmark, a profile chip (avatar + name +
 * email), a light/dark theme switch, and a logout button.
 */
export function DashboardHeader({
  name,
  email,
  initials,
  role,
}: {
  name: string;
  email: string;
  initials: string;
  role?: string;
}) {
  return (
    <header className="flex items-center gap-4 border-b border-line pb-4 mb-7">
      <Logo size={30} textClassName="text-[18px]" />
      {role && (
        <span className="hidden sm:inline text-[12px] text-ink-faint border border-line rounded-full px-2.5 py-[3px]">
          {role}
        </span>
      )}

      <div className="ml-auto flex items-center gap-3">
        {/* Profile chip */}
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-full bg-brand-tint text-brand flex items-center justify-center text-[13px] font-semibold shrink-0">
            {initials || (name[0] ?? "U").toUpperCase()}
          </span>
          <span className="hidden sm:flex flex-col leading-tight">
            <span className="text-[14px] font-medium text-ink">{name}</span>
            <span className="text-[12px] text-ink-faint">{email}</span>
          </span>
        </div>

        <ThemeToggle />

        <form action={signOut}>
          <button
            type="submit"
            title="Log out"
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-line text-[13px] text-ink-soft hover:text-ink hover:bg-muted cursor-pointer transition-colors"
          >
            <LogOut size={15} aria-hidden />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </form>
      </div>
    </header>
  );
}
