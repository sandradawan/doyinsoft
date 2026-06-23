import Link from "next/link";
import { VendorShell } from "@/components/vendor-shell";
import { StatusBadge } from "@/components/status-badge";
import { Pagination } from "@/components/pagination";
import { getVendorOrders } from "@/lib/data";
import { requireVendor } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";
import { markFulfilment } from "./actions";

const FILTERS: { label: string; value: OrderStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Paid", value: "paid" },
  { label: "Pending", value: "pending" },
  { label: "Refunded", value: "refunded" },
];

const STATUSES: OrderStatus[] = ["paid", "pending", "refunded"];

function shortDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-NG", { day: "2-digit", month: "short" });
}

const PAGE_SIZE = 10;

export default async function VendorOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const vendor = await requireVendor();
  const { status, q, page: pageParam } = await searchParams;
  const active = (status as OrderStatus | "all") ?? "all";
  const filter = STATUSES.includes(active as OrderStatus) ? (active as OrderStatus) : undefined;
  const query = q?.trim() ?? "";
  const page = Math.max(1, Number(pageParam) || 1);
  const { items: orders, total } = await getVendorOrders(vendor.id, {
    status: filter,
    page,
    pageSize: PAGE_SIZE,
    search: query || undefined,
  });

  const hrefForPage = (p: number) => {
    const params = new URLSearchParams();
    if (active !== "all") params.set("status", active);
    if (query) params.set("q", query);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return `/vendor/orders${s ? `?${s}` : ""}`;
  };

  return (
    <VendorShell active="orders">
      <p className="text-[13px] font-medium m-0 mb-3">Orders</p>

      {/* Search */}
      <form method="get" className="flex gap-2 mb-3 max-w-md">
        {active !== "all" ? <input type="hidden" name="status" value={active} /> : null}
        <input
          name="q"
          defaultValue={query}
          placeholder="Search email, reference or order ID…"
          className="field flex-1"
        />
        <button className="btn-primary px-4 py-2">Search</button>
      </form>

      {/* Status filter pills */}
      <div className="flex gap-2 flex-wrap mb-4">
        {FILTERS.map((f) => {
          const isActive = f.value === active;
          const sp = new URLSearchParams();
          if (f.value !== "all") sp.set("status", f.value);
          if (query) sp.set("q", query);
          const href = `/vendor/orders${sp.toString() ? `?${sp}` : ""}`;
          return (
            <Link
              key={f.value}
              href={href}
              className={[
                "text-[12px] px-3 py-[5px] rounded-md no-underline border transition-colors",
                isActive
                  ? "border-brand text-brand bg-brand-tint font-medium"
                  : "border-line text-ink-soft hover:border-line-strong hover:text-ink",
              ].join(" ")}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {orders.length === 0 ? (
        <p className="text-[13px] text-ink-soft">No orders in this view yet.</p>
      ) : (
        <div>
          <div className="flex items-center gap-3 pb-2 text-[11px] text-ink-faint">
            <span className="flex-1">Product</span>
            <span className="w-24 shrink-0">Buyer</span>
            <span className="w-14 shrink-0 text-right">Date</span>
            <span className="w-24 shrink-0 text-right">Amount</span>
            <span className="w-16 shrink-0 text-center">Status</span>
          </div>
          {orders.map((order) => (
            <div key={order.id} className="py-3 border-t border-line text-[13px]">
              <div className="flex items-center gap-3">
                <span className="flex-1 min-w-0 truncate">{order.product.name}</span>
                <span className="w-24 shrink-0 text-ink-soft truncate">{order.buyer_name}</span>
                <span className="w-14 shrink-0 text-right text-ink-faint text-[11px]">
                  {shortDate(order.created_at)}
                </span>
                <span className="w-24 shrink-0 text-right">
                  {formatPrice(order.amount_minor, order.currency)}
                </span>
                <StatusBadge status={order.status} />
              </div>

              {/* Fulfilment for physical/service orders */}
              {order.fulfilment_status && order.status === "paid" && (
                <div className="flex items-center flex-wrap gap-2 mt-2 pl-1">
                  <span className="text-[11px] text-ink-faint">
                    Deliver: {order.shipping_name || order.buyer_name}
                    {order.shipping_phone ? ` · ${order.shipping_phone}` : ""}
                    {order.shipping_address ? ` · ${order.shipping_address}` : ""}
                  </span>
                  <span
                    className={`text-[11px] px-2 py-[2px] rounded-md ${
                      order.fulfilment_status === "delivered"
                        ? "bg-success-bg text-success"
                        : order.fulfilment_status === "shipped"
                          ? "bg-info-bg text-info"
                          : "bg-muted text-ink-soft"
                    }`}
                  >
                    {order.fulfilment_status}
                  </span>
                  {order.fulfilment_status !== "shipped" && order.fulfilment_status !== "delivered" && (
                    <form action={markFulfilment}>
                      <input type="hidden" name="id" value={order.id} />
                      <input type="hidden" name="status" value="shipped" />
                      <button className="text-[11px] text-brand border border-line rounded-md px-2 py-[3px] bg-transparent cursor-pointer hover:border-brand">
                        Mark shipped
                      </button>
                    </form>
                  )}
                  {order.fulfilment_status !== "delivered" && (
                    <form action={markFulfilment}>
                      <input type="hidden" name="id" value={order.id} />
                      <input type="hidden" name="status" value="delivered" />
                      <button className="text-[11px] text-ink-soft border border-line rounded-md px-2 py-[3px] bg-transparent cursor-pointer hover:border-line-strong">
                        Mark delivered
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} total={total} pageSize={PAGE_SIZE} hrefForPage={hrefForPage} />
    </VendorShell>
  );
}
