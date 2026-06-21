import type { OrderStatus } from "@/lib/types";

const STYLES: Record<OrderStatus, string> = {
  paid: "bg-success-bg text-success",
  pending: "bg-info-bg text-info",
  refunded: "bg-muted text-ink-soft",
};

/** Order status pill — semantic colors, 11px, rounded. */
export function StatusBadge({ status }: { status: OrderStatus }) {
  const label = status[0].toUpperCase() + status.slice(1);
  return (
    <span
      className={`text-[11px] px-2 py-[2px] rounded-md w-16 text-center shrink-0 ${STYLES[status]}`}
    >
      {label}
    </span>
  );
}
