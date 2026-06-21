import Link from "next/link";
import { LogoMark } from "@/components/logo";

export function Footer() {
  return (
    <footer className="border-t border-line mt-12 pt-6 pb-2">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <LogoMark size={20} />
          <span className="text-[12px] text-ink-soft">
            Software built for African markets
          </span>
        </div>
        <nav className="flex flex-wrap gap-4 text-[12px]">
          <Link href="/" className="text-ink-soft no-underline hover:text-ink">
            Browse
          </Link>
          <Link href="/sign-up" className="text-ink-soft no-underline hover:text-ink">
            Sell on DoyinSoft
          </Link>
          <Link href="/downloads" className="text-ink-soft no-underline hover:text-ink">
            Downloads
          </Link>
        </nav>
      </div>
      <p className="text-[11px] text-ink-faint mt-4 m-0">
        © {2026} DoyinSoft. All rights reserved.
      </p>
    </footer>
  );
}
