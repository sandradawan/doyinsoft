import { TrendingUp, TrendingDown } from "lucide-react";
import { VendorShell } from "@/components/vendor-shell";
import { StatusBadge } from "@/components/status-badge";
import { BarChart, LineChart } from "@/components/charts";
import { Pagination } from "@/components/pagination";
import { VendorOnboarding } from "@/components/vendor-onboarding";
import {
  getDashboardMetrics,
  getRecentOrders,
  getVendorOrders,
  getVendorProducts,
  getVendorSubaccount,
  vendorMonthlyStats,
  vendorTodayStats,
  vendorTopProducts,
} from "@/lib/data";
import { requireVendor } from "@/lib/auth";
import { vendorCouponStats } from "@/lib/coupons";
import { formatPrice } from "@/lib/format";

const ORDERS_PER_PAGE = 3;

export default async function VendorDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const vendor = await requireVendor();
  const { q, page: pageParam } = await searchParams;
  const query = q?.trim() ?? "";
  const oPage = Math.max(1, Number(pageParam) || 1);

  const [metrics, recent, monthly, topProducts, products, subaccount, today, coupons, orderPage] =
    await Promise.all([
      getDashboardMetrics(vendor.id),
      getRecentOrders(vendor.id),
      vendorMonthlyStats(vendor.id),
      vendorTopProducts(vendor.id),
      getVendorProducts(vendor.id),
      getVendorSubaccount(vendor.id),
      vendorTodayStats(vendor.id),
      vendorCouponStats(vendor.id),
      getVendorOrders(vendor.id, {
        page: oPage,
        pageSize: ORDERS_PER_PAGE,
        search: query || undefined,
      }),
    ]);
  const orders = orderPage.items;

  const ordersHref = (p: number) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return `/vendor/dashboard${s ? `?${s}` : ""}`;
  };

  const last = monthly[monthly.length - 1]?.revenue_minor ?? 0;
  const prev = monthly[monthly.length - 2]?.revenue_minor ?? 0;
  const growth = prev === 0 ? (last > 0 ? 100 : 0) : Math.round(((last - prev) / prev) * 100);

  const cards: { label: string; value: string; sub?: string; highlight?: boolean }[] = [
    {
      label: "Sales today",
      value: formatPrice(today.revenue_minor, metrics.currency),
      sub: `${today.count} order${today.count === 1 ? "" : "s"}`,
      highlight: true,
    },
    { label: "Revenue (30d)", value: formatPrice(metrics.revenue_minor, metrics.currency) },
    { label: "Units sold", value: String(metrics.units_sold) },
    { label: "Pending payout", value: formatPrice(metrics.pending_payout_minor, metrics.currency) },
    {
      label: "Coupons redeemed",
      value: String(coupons.redeemed),
      sub:
        coupons.discount_minor > 0
          ? `${formatPrice(coupons.discount_minor, metrics.currency)} discounted`
          : undefined,
    },
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

      <VendorOnboarding
        whatsappDone={Boolean(vendor.whatsapp)}
        bankDone={subaccount.connected}
        productDone={products.length > 0}
        saleDone={recent.some((o) => o.status === "paid")}
      />

      {/* Metric cards */}
      <div className="grid [grid-template-columns:repeat(auto-fit,minmax(140px,1fr))] gap-3 mb-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className={`rounded-md p-4 ${c.highlight ? "bg-brand-tint" : "bg-muted"}`}
          >
            <p className={`text-[13px] m-0 mb-[6px] ${c.highlight ? "text-brand" : "text-ink-soft"}`}>
              {c.label}
            </p>
            <p
              className={`text-[22px] font-medium m-0 ${c.highlight ? "text-brand" : "text-ink"}`}
            >
              {c.value}
            </p>
            {c.sub && <p className="text-[11px] text-ink-faint m-0 mt-1">{c.sub}</p>}
          </div>
        ))}
      </div>

      {/* Growth charts */}
      <div className="grid gap-4 mb-6 md:grid-cols-2">
        <div className="border border-line rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] font-medium m-0">Revenue (6 months)</p>
            <span
              className={`inline-flex items-center gap-1 text-[11px] ${growth >= 0 ? "text-success" : "text-info"}`}
            >
              {growth >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {growth >= 0 ? "+" : ""}
              {growth}% MoM
            </span>
          </div>
          <LineChart data={monthly.map((m) => ({ label: m.label, value: m.revenue_minor }))} />
        </div>

        <div className="border border-line rounded-lg p-4">
          <p className="text-[13px] font-medium m-0 mb-3">Top products by revenue</p>
          {topProducts.length ? (
            <BarChart data={topProducts.map((p) => ({ label: p.label, value: p.value }))} />
          ) : (
            <p className="text-[12px] text-ink-soft">No sales yet.</p>
          )}
        </div>
      </div>

      {/* Recent orders */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-[13px] font-medium m-0">Recent orders</p>
        <a href="/vendor/orders" className="text-[12px] text-brand no-underline hover:underline">
          View all →
        </a>
      </div>
      <form method="get" className="flex gap-2 mb-3 max-w-md">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search email, reference or order ID…"
          className="field flex-1"
        />
        <button className="btn-primary px-4 py-2">Search</button>
      </form>
      {orders.length === 0 ? (
        <p className="text-[13px] text-ink-soft">
          {query ? "No orders match your search." : "No orders yet."}
        </p>
      ) : (
        <div>
          {orders.map((order) => (
            <div
              key={order.id}
              className="flex justify-between items-center py-2 border-t border-line text-[13px] gap-3"
            >
              <span className="flex-1 min-w-0 truncate">{order.product.name}</span>
              <span className="text-ink-soft w-24 shrink-0 truncate">
                {order.buyer_email || order.buyer_name}
              </span>
              <span className="w-20 text-right shrink-0">
                {formatPrice(order.amount_minor, order.currency)}
              </span>
              <StatusBadge status={order.status} />
            </div>
          ))}
        </div>
      )}
      <Pagination
        page={oPage}
        total={orderPage.total}
        pageSize={ORDERS_PER_PAGE}
        hrefForPage={ordersHref}
      />
    </VendorShell>
  );
}
