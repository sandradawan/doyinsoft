import Link from "next/link";
import { adminStats } from "@/lib/data";
import { formatPrice } from "@/lib/format";

export default async function AdminOverview() {
  const s = await adminStats();

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
