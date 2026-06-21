import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug, getReviews } from "@/lib/data";
import { Stars } from "@/components/stars";
import { formatBytes, formatPrice } from "@/lib/format";
import { ReviewForm } from "./review-form";

function shortDate(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const reviews = await getReviews(product.id);

  return (
    <main className="max-w-5xl mx-auto px-5 py-6">
      <div className="grid gap-6 md:[grid-template-columns:minmax(0,1.5fr)_minmax(0,1fr)]">
        {/* Left column */}
        <div>
          <p className="text-[12px] text-ink-faint m-0 mb-[10px]">
            <Link href="/" className="text-ink-faint no-underline hover:text-brand">
              {product.category}
            </Link>{" "}
            / {product.name}
          </p>

          {/* App icon + name */}
          <div className="flex items-center gap-3 mb-3">
            {product.icon_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.icon_url}
                alt=""
                className="w-12 h-12 rounded-lg object-cover bg-muted shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-muted shrink-0" />
            )}
            <div>
              <p className="text-[16px] font-medium m-0">{product.name}</p>
              {product.rating_count > 0 && (
                <Stars value={product.rating_avg} count={product.rating_count} size={12} />
              )}
            </div>
          </div>

          {/* Main screenshot */}
          {product.screenshots[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.screenshots[0]}
              alt={`${product.name} screenshot`}
              className="w-full rounded-lg mb-2 object-cover bg-muted max-h-[320px]"
            />
          ) : (
            <div className="bg-muted rounded-lg h-[140px] mb-2" />
          )}

          {/* Thumbnail row */}
          {product.screenshots.length > 1 ? (
            <div className="flex gap-2 mb-4 flex-wrap">
              {product.screenshots.slice(1, 6).map((s) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={s}
                  src={s}
                  alt=""
                  className="rounded-md w-20 h-14 object-cover bg-muted border border-line"
                />
              ))}
            </div>
          ) : (
            !product.screenshots.length && (
              <div className="flex gap-2 mb-4">
                <div className="bg-muted rounded-md w-12 h-9" />
                <div className="bg-muted rounded-md w-12 h-9" />
                <div className="bg-muted rounded-md w-12 h-9" />
              </div>
            )
          )}

          <p className="text-[13px] text-ink-soft leading-[1.7] m-0 mb-3">
            {product.description}
          </p>

          <p className="text-[12px] font-medium m-0 mb-1">System requirements</p>
          <p className="text-[12px] text-ink-soft m-0 mb-3">
            {product.system_requirements}
          </p>

          <p className="text-[11px] text-ink-faint m-0">
            Version {product.version}
            {product.file_size ? ` · ${formatBytes(product.file_size)}` : ""} ·{" "}
            {product.download_count.toLocaleString()} downloads
          </p>

          {/* Reviews */}
          <div className="mt-8 pt-5 border-t border-line">
            <div className="flex items-center gap-2 mb-4">
              <p className="text-[14px] font-medium m-0">Reviews</p>
              {product.rating_count > 0 && (
                <Stars value={product.rating_avg} count={product.rating_count} />
              )}
            </div>

            {reviews.length === 0 ? (
              <p className="text-[13px] text-ink-soft mb-5">
                No reviews yet. Be the first to review {product.name}.
              </p>
            ) : (
              <div className="mb-6">
                {reviews.map((r) => (
                  <div key={r.id} className="py-3 border-t border-line first:border-t-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[13px] font-medium">{r.author_name}</span>
                      <span className="text-[11px] text-ink-faint">{shortDate(r.created_at)}</span>
                    </div>
                    <Stars value={r.rating} size={12} />
                    {r.body && (
                      <p className="text-[13px] text-ink-soft leading-[1.7] m-0 mt-1">{r.body}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <p className="text-[13px] font-medium m-0 mb-2">Write a review</p>
            <ReviewForm productId={product.id} slug={product.slug} />
          </div>
        </div>

        {/* Right column */}
        <div>
          {/* Price card */}
          <div className="border border-line rounded-lg p-4 mb-3">
            <p className="text-[24px] font-medium m-0 mb-1">
              {formatPrice(product.price_minor, product.currency)}
            </p>
            <p className="text-[12px] text-ink-soft m-0 mb-[14px]">
              One-time purchase, license key included
            </p>
            <Link
              href={`/checkout/new?product=${product.slug}`}
              className="btn-primary block w-full text-center py-[10px] no-underline"
            >
              Buy license
            </Link>
            <div className="flex gap-[6px] mt-3 flex-wrap">
              {product.os_badges.map((badge) => (
                <span
                  key={badge}
                  className="text-[11px] px-[9px] py-[3px] bg-muted rounded-md"
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>

          {/* Vendor mini-card */}
          <Link
            href="/vendor/dashboard"
            className="border border-line rounded-lg p-[14px] flex items-center gap-[10px] no-underline text-ink hover:border-brand transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-info-bg flex items-center justify-center text-[12px] font-medium text-info shrink-0">
              {product.vendor.initials}
            </div>
            <div>
              <p className="text-[13px] font-medium m-0">{product.vendor.name}</p>
              <p className="text-[11px] text-ink-soft m-0">
                {product.vendor.verified ? "Verified vendor" : "Vendor"}
              </p>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
