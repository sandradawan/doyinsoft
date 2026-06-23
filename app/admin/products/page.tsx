import Link from "next/link";
import { Star } from "lucide-react";
import { ADMIN_PAGE_SIZE, adminProducts } from "@/lib/data";
import { Pagination } from "@/components/pagination";
import { formatPrice } from "@/lib/format";
import type { ProductStatus } from "@/lib/types";
import { approveProduct, rejectProduct, toggleFeatured } from "../actions";

const FILTERS: { label: string; value: ProductStatus | "all" }[] = [
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "All", value: "all" },
];

const STATUS_BADGE: Record<ProductStatus, string> = {
  pending: "bg-info-bg text-info",
  approved: "bg-success-bg text-success",
  rejected: "bg-muted text-ink-soft",
};

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; q?: string }>;
}) {
  const { status, page: pageParam, q } = await searchParams;
  const active = (status as ProductStatus | "all") ?? "pending";
  const filter = active === "all" ? undefined : (active as ProductStatus);
  const query = q?.trim() ?? "";
  const page = Math.max(1, Number(pageParam) || 1);
  const { items: products, total } = await adminProducts(filter, page, query || undefined);
  const totalPages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));

  return (
    <div>
      <h1 className="text-[22px] font-medium m-0 mb-4">Products</h1>

      <form method="get" className="flex gap-2 mb-3 max-w-md">
        {active !== "all" ? <input type="hidden" name="status" value={active} /> : null}
        <input
          name="q"
          defaultValue={query}
          placeholder="Search product name or slug…"
          className="field flex-1"
        />
        <button className="btn-primary px-4 py-2">Search</button>
      </form>

      <div className="flex gap-2 flex-wrap mb-5">
        {FILTERS.map((f) => {
          const isActive = f.value === active;
          return (
            <Link
              key={f.value}
              href={`/admin/products?status=${f.value}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
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

      {products.length === 0 ? (
        <p className="text-[13px] text-ink-soft">No products in this view.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {products.map((p) => (
            <div key={p.id} className="border border-line rounded-lg p-4">
              <div className="flex items-start gap-3">
                {p.icon_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.icon_url} alt="" className="w-10 h-10 rounded-md object-cover bg-muted shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-md bg-muted shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/products/${p.slug}`}
                      className="text-[13px] font-medium text-ink no-underline hover:underline"
                    >
                      {p.name}
                    </Link>
                    <span className={`text-[11px] px-2 py-[2px] rounded-md ${STATUS_BADGE[p.status]}`}>
                      {p.status}
                    </span>
                    {p.featured && (
                      <span className="text-[11px] text-brand inline-flex items-center gap-1">
                        <Star size={11} className="fill-current" /> featured
                      </span>
                    )}
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="text-[11px] text-brand no-underline hover:underline ml-auto"
                    >
                      Review →
                    </Link>
                  </div>
                  <p className="text-[12px] text-ink-soft m-0">
                    by {p.vendor.name} · {p.category || "—"} ·{" "}
                    {formatPrice(p.price_minor, p.currency)} · {p.download_count} downloads
                  </p>
                  {p.tagline && <p className="text-[12px] text-ink-faint m-0 mt-1">{p.tagline}</p>}
                  {p.status === "rejected" && p.rejection_reason && (
                    <p className="text-[11px] text-ink-faint m-0 mt-1">
                      Reason: {p.rejection_reason}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-wrap mt-3 pt-3 border-t border-line">
                {p.status !== "approved" && (
                  <form action={approveProduct}>
                    <input type="hidden" name="id" value={p.id} />
                    <button className="btn-primary text-[12px] px-3 py-[6px]">Approve</button>
                  </form>
                )}

                {p.status !== "rejected" && (
                  <form action={rejectProduct} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={p.id} />
                    <input
                      name="reason"
                      placeholder="Reason (optional)"
                      className="field text-[12px] py-[5px] w-44"
                    />
                    <button className="text-[12px] text-info bg-info-bg rounded-md px-3 py-[6px] border-0 cursor-pointer">
                      Reject
                    </button>
                  </form>
                )}

                <form action={toggleFeatured}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="featured" value={String(p.featured)} />
                  <button className="text-[12px] text-ink-soft border border-line rounded-md px-3 py-[6px] bg-transparent cursor-pointer hover:border-brand hover:text-brand">
                    {p.featured ? "Unfeature" : "Feature"}
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination
        page={page}
        total={total}
        pageSize={ADMIN_PAGE_SIZE}
        hrefForPage={(p) => {
          const params = new URLSearchParams();
          if (active !== "all") params.set("status", active);
          if (query) params.set("q", query);
          if (p > 1) params.set("page", String(p));
          const s = params.toString();
          return `/admin/products${s ? `?${s}` : ""}`;
        }}
      />
    </div>
  );
}
