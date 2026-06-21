import Link from "next/link";
import { Plus, Download } from "lucide-react";
import { VendorShell } from "@/components/vendor-shell";
import { getVendorProducts } from "@/lib/data";
import { requireVendor } from "@/lib/auth";
import { formatBytes, formatPrice } from "@/lib/format";

export default async function VendorProductsPage() {
  const vendor = await requireVendor();
  const products = await getVendorProducts(vendor.id);

  return (
    <VendorShell active="products">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[13px] font-medium m-0">Your products</p>
        <Link
          href="/vendor/products/new"
          className="btn-primary inline-flex items-center gap-[6px] px-3 py-[6px] no-underline"
        >
          <Plus size={14} aria-hidden /> Add product
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="text-[13px] text-ink-soft">
          No products yet. Add your first one to start selling.
        </p>
      ) : (
        <div>
          {/* Header row */}
          <div className="flex items-center gap-3 pb-2 text-[11px] text-ink-faint">
            <span className="flex-1">Product</span>
            <span className="w-16 shrink-0">Version</span>
            <span className="w-20 shrink-0 text-right">Price</span>
            <span className="w-24 shrink-0 text-right">Downloads</span>
            <span className="w-16 shrink-0 text-right">File</span>
            <span className="w-10 shrink-0 text-right">Edit</span>
          </div>

          {products.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 py-3 border-t border-line text-[13px]"
            >
              <div className="flex-1 min-w-0">
                <span className="inline-flex items-center gap-2">
                  <Link
                    href={`/products/${p.slug}`}
                    className="text-ink no-underline hover:underline"
                  >
                    {p.name}
                  </Link>
                  <span
                    className={`text-[11px] px-2 py-[1px] rounded-md ${
                      p.status === "approved"
                        ? "bg-success-bg text-success"
                        : p.status === "pending"
                          ? "bg-info-bg text-info"
                          : "bg-muted text-ink-soft"
                    }`}
                  >
                    {p.status}
                  </span>
                </span>
                <span className="text-ink-faint"> · {p.category}</span>
                {p.status === "rejected" && p.rejection_reason && (
                  <p className="text-[11px] text-ink-faint m-0">Reason: {p.rejection_reason}</p>
                )}
              </div>
              <span className="w-16 shrink-0 text-ink-soft">{p.version}</span>
              <span className="w-20 shrink-0 text-right">
                {formatPrice(p.price_minor, p.currency)}
              </span>
              <span className="w-24 shrink-0 text-right text-ink-soft inline-flex items-center justify-end gap-1">
                <Download size={12} aria-hidden /> {p.download_count}
              </span>
              <span className="w-16 shrink-0 text-right text-ink-faint text-[11px]">
                {p.file_path ? formatBytes(p.file_size) : "none"}
              </span>
              <span className="w-10 shrink-0 text-right">
                <Link
                  href={`/vendor/products/${p.id}/edit`}
                  className="text-brand no-underline hover:underline text-[12px]"
                >
                  Edit
                </Link>
              </span>
            </div>
          ))}
        </div>
      )}
    </VendorShell>
  );
}
