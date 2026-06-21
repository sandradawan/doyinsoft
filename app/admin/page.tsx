import Link from "next/link";
import { TrendingUp, TrendingDown } from "lucide-react";
import { adminMonthlyStats, adminStats } from "@/lib/data";
import { formatPrice } from "@/lib/format";
import { BarChart, LineChart } from "@/components/charts";

function growth(series: { revenue_minor: number }[]): number {
  if (series.length < 2) return 0;
  const last = series[series.length - 1].revenue_minor;
  const prev = series[series.length - 2].revenue_minor;
  if (prev === 0) return last > 0 ? 100 : 0;
  return Math.round(((last - prev) / prev) * 100);
}

export default async function AdminOverview() {
  const [s, monthly] = await Promise.all([adminStats(), adminMonthlyStats()]);
  const g = growth(monthly);

  const cards = [
    { label: "Pending review", value: String(s.pending), highlight: s.pending > 0 },
    { label: "Products", value: String(s.products) },
    { label: "Vendors", value: String(s.vendors) },
    { label: "Paid revenue", value: formatPrice(s.revenue_minor, "NGN") },
    { label: "Orders", value: String(s.orders) },
  ];

  return (
    <div>
      <h1 className="text-[22px] font-medium m-0 mb-4">Overview</h1>

      <div className="grid gap-3 mb-6 [grid-template-columns:repeat(auto-fit,minmax(140px,1fr))]">
        {cards.map((c) => (
          <div
            key={c.label}
            className={`rounded-md p-4 ${c.highlight ? "bg-info-bg" : "bg-muted"}`}
          >
            <p className="text-[13px] text-ink-soft m-0 mb-[6px]">{c.label}</p>
            <p
              className={`text-[22px] font-medium m-0 ${c.highlight ? "text-info" : "text-ink"}`}
            >
              {c.value}
            </p>
          </div>
        ))}
      </div>

      {/* Growth charts */}
      <div className="grid gap-4 mb-6 md:grid-cols-2">
        <div className="border border-line rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] font-medium m-0">Revenue (6 months)</p>
            <span
              className={`inline-flex items-center gap-1 text-[11px] ${g >= 0 ? "text-success" : "text-info"}`}
            >
              {g >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {g >= 0 ? "+" : ""}
              {g}% MoM
            </span>
          </div>
          <LineChart data={monthly.map((m) => ({ label: m.label, value: m.revenue_minor }))} />
        </div>

        <div className="border border-line rounded-lg p-4">
          <p className="text-[13px] font-medium m-0 mb-3">Orders (6 months)</p>
          <BarChart data={monthly.map((m) => ({ label: m.label, value: m.orders }))} />
        </div>
      </div>

      {s.pending > 0 ? (
        <Link
          href="/admin/products?status=pending"
          className="btn-primary inline-block px-4 py-2 no-underline"
        >
          Review {s.pending} pending product{s.pending === 1 ? "" : "s"}
        </Link>
      ) : (
        <p className="text-[13px] text-ink-soft">Nothing waiting for review. 🎉</p>
      )}
    </div>
  );
}
