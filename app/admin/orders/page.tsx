import Link from "next/link";
import { adminOrders } from "@/lib/data";
import { formatPrice } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import type { OrderStatus } from "@/lib/types";
import { refundOrder, resendLicense, revokeLicense } from "../actions";

const FILTERS: { label: string; value: OrderStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Paid", value: "paid" },
  { label: "Pending", value: "pending" },
  { label: "Refunded", value: "refunded" },
];

function shortDate(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-NG", { day: "2-digit", month: "short" });
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const active = (status as OrderStatus | "all") ?? "all";
  const filter = active === "all" ? undefined : (active as OrderStatus);
  const orders = await adminOrders(filter);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-[22px] font-medium m-0">Orders</h1>
        <a
          href={`/admin/orders/export?status=${active}`}
          className="text-[12px] border border-line rounded-md px-3 py-[6px] no-underline text-ink-soft hover:border-brand hover:text-brand"
        >
          Export CSV
        </a>
      </div>

      <div className="flex gap-2 flex-wrap mb-5">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={`/admin/orders?status=${f.value}`}
            className={[
              "text-[12px] px-3 py-[5px] rounded-md no-underline border transition-colors",
              f.value === active
                ? "border-brand text-brand bg-brand-tint font-medium"
                : "border-line text-ink-soft hover:border-line-strong hover:text-ink",
            ].join(" ")}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <p className="text-[13px] text-ink-soft">No orders in this view.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {orders.map((o) => (
            <div key={o.id} className="border border-line rounded-lg p-3 text-[13px]">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="flex-1 min-w-0 truncate font-medium">{o.product.name}</span>
                <span className="text-ink-soft">{o.buyer_name}</span>
                <span className="text-ink-faint text-[11px]">{shortDate(o.created_at)}</span>
                <span>{formatPrice(o.amount_minor, o.currency)}</span>
                <StatusBadge status={o.status} />
              </div>
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-line">
                <form action={resendLicense}>
                  <input type="hidden" name="id" value={o.id} />
                  <button className="text-[12px] text-ink-soft border border-line rounded-md px-3 py-[5px] bg-transparent cursor-pointer hover:border-brand hover:text-brand">
                    Resend license
                  </button>
                </form>
                <form action={revokeLicense}>
                  <input type="hidden" name="id" value={o.id} />
                  <button className="text-[12px] text-ink-soft border border-line rounded-md px-3 py-[5px] bg-transparent cursor-pointer hover:border-line-strong">
                    Revoke license
                  </button>
                </form>
                {o.status !== "refunded" && (
                  <form action={refundOrder} className="ml-auto">
                    <input type="hidden" name="id" value={o.id} />
                    <button className="text-[12px] text-info bg-info-bg rounded-md px-3 py-[5px] border-0 cursor-pointer">
                      Refund
                    </button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
