import { VendorShell } from "@/components/vendor-shell";
import { StatusBadge } from "@/components/status-badge";
import { getDashboardMetrics, getRecentOrders } from "@/lib/data";
import { requireVendor } from "@/lib/auth";
import { formatPrice } from "@/lib/format";

export default async function VendorDashboardPage() {
  const vendor = await requireVendor();
  const [metrics, orders] = await Promise.all([
    getDashboardMetrics(vendor.id),
    getRecentOrders(vendor.id),
  ]);

  const cards = [
    { label: "Revenue (30d)", value: formatPrice(metrics.revenue_minor, metrics.currency) },
    { label: "Units sold", value: String(metrics.units_sold) },
    { label: "Pending payout", value: formatPrice(metrics.pending_payout_minor, metrics.currency) },
  ];

  return (
    <VendorShell active="overview">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[16px] font-medium m-0">{vendor.name}</h1>
          <p className="text-[12px] text-ink-faint m-0">{vendor.email}</p>
        </div>
      </div>

      {vendor.isDemo && (
        <p className="text-[12px] text-info bg-info-bg rounded-md px-3 py-2 mb-4">
          Demo mode — connect Supabase and sign up to manage a real vendor account.
        </p>
      )}

      {/* Metric cards */}
      <div className="grid [grid-template-columns:repeat(3,1fr)] gap-3 mb-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-muted rounded-md p-4">
            <p className="text-[13px] text-ink-soft m-0 mb-[6px]">{c.label}</p>
            <p className="text-[22px] font-medium m-0">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <p className="text-[13px] font-medium m-0 mb-2">Recent orders</p>
      <div>
        {orders.map((order) => (
          <div
            key={order.id}
            className="flex justify-between items-center py-2 border-t border-line text-[13px] gap-3"
          >
            <span className="flex-1 min-w-0 truncate">{order.product.name}</span>
            <span className="text-ink-soft w-20 shrink-0">{order.buyer_name}</span>
            <span className="w-20 text-right shrink-0">
              {formatPrice(order.amount_minor, order.currency)}
            </span>
            <StatusBadge status={order.status} />
          </div>
        ))}
      </div>
    </VendorShell>
  );
}
