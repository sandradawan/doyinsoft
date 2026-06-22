import Link from "next/link";
import { Check } from "lucide-react";

interface Step {
  label: string;
  done: boolean;
  href: string;
  cta: string;
}

/**
 * New-seller activation checklist. Renders the next steps to first sale and
 * hides itself once everything is done.
 */
export function VendorOnboarding({
  whatsappDone,
  bankDone,
  productDone,
  saleDone,
}: {
  whatsappDone: boolean;
  bankDone: boolean;
  productDone: boolean;
  saleDone: boolean;
}) {
  const steps: Step[] = [
    { label: "Add your WhatsApp number", done: whatsappDone, href: "/vendor/settings", cta: "Add" },
    { label: "Connect your bank to get paid", done: bankDone, href: "/vendor/payouts", cta: "Connect" },
    { label: "List your first product", done: productDone, href: "/vendor/products/new", cta: "List" },
    { label: "Make your first sale", done: saleDone, href: "/vendor/products", cta: "Share" },
  ];

  const completed = steps.filter((s) => s.done).length;
  if (completed === steps.length) return null;

  const pct = Math.round((completed / steps.length) * 100);

  return (
    <div className="border border-line rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[13px] font-medium m-0">Get set up to sell</p>
        <span className="text-[11px] text-ink-faint">
          {completed} of {steps.length} done
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden mb-4">
        <div className="h-full bg-brand transition-all" style={{ width: `${pct}%` }} />
      </div>

      <div className="flex flex-col gap-1">
        {steps.map((s) => (
          <div key={s.label} className="flex items-center gap-3 py-1.5 text-[13px]">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                s.done ? "bg-success-bg text-success" : "bg-muted text-ink-faint"
              }`}
            >
              {s.done ? <Check size={12} /> : <span className="w-1.5 h-1.5 rounded-full bg-ink-faint" />}
            </span>
            <span className={s.done ? "text-ink-soft line-through" : "text-ink flex-1"}>
              {s.label}
            </span>
            {!s.done && (
              <Link
                href={s.href}
                className="ml-auto text-[12px] text-brand no-underline hover:underline"
              >
                {s.cta} →
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
