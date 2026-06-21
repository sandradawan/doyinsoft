import Link from "next/link";
import type { Platform } from "@/lib/types";

const PILLS: { label: string; value: Platform | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Desktop", value: "desktop" },
  { label: "Mobile", value: "mobile" },
  { label: "Web app", value: "web" },
  { label: "Free", value: "free" },
];

/**
 * Filter pills row. Active pill uses the stronger border; inactive pills use
 * the hairline border with secondary text. Filtering is driven by ?platform=.
 */
export function FilterPills({ active }: { active: Platform | "all" }) {
  return (
    <div className="flex gap-2 flex-wrap mb-4">
      {PILLS.map((pill) => {
        const isActive = pill.value === active;
        const href = pill.value === "all" ? "/" : `/?platform=${pill.value}`;
        return (
          <Link
            key={pill.value}
            href={href}
            className={[
              "text-[12px] px-3 py-[5px] rounded-md no-underline border transition-colors",
              isActive
                ? "border-brand text-brand bg-brand-tint font-medium"
                : "border-line text-ink-soft hover:border-line-strong hover:text-ink",
            ].join(" ")}
          >
            {pill.label}
          </Link>
        );
      })}
    </div>
  );
}
