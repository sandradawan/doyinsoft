import Link from "next/link";
import { Stars } from "@/components/stars";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";

/**
 * Storefront product card: icon placeholder, name, vendor byline, price.
 * 1px border, radius-lg, padding 12px.
 */
export function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="block border border-line rounded-lg p-3 no-underline text-ink hover:border-brand transition-colors"
    >
      {product.icon_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.icon_url}
          alt=""
          className="w-9 h-9 rounded-md mb-[10px] object-cover bg-muted"
        />
      ) : (
        <div className="w-9 h-9 bg-muted rounded-md mb-[10px]" />
      )}
      <p className="text-[13px] font-medium m-0 mb-[2px]">{product.name}</p>
      <p className="text-[11px] text-ink-soft m-0 mb-[6px]">
        by {product.vendor.name}
      </p>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] m-0">
          {formatPrice(product.price_minor, product.currency)}
        </p>
        {product.rating_count > 0 && (
          <span className="inline-flex items-center gap-1 text-[11px] text-ink-soft">
            <Stars value={product.rating_avg} size={11} />
            {product.rating_avg.toFixed(1)}
          </span>
        )}
      </div>
    </Link>
  );
}
