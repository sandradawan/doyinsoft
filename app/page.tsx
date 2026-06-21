import Link from "next/link";
import { TopNav } from "@/components/top-nav";
import { FilterPills } from "@/components/filter-pills";
import { ProductCard } from "@/components/product-card";
import { HeroCarousel } from "@/components/hero-carousel";
import { getProducts } from "@/lib/data";
import type { Platform } from "@/lib/types";

const PLATFORMS: Platform[] = ["desktop", "mobile", "web"];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string; q?: string }>;
}) {
  const { platform, q } = await searchParams;
  const active = (platform as Platform | "all") ?? "all";
  const query = q?.trim() ?? "";

  // "Free" is a price filter, not a platform; everything else filters by platform.
  const all = await getProducts(
    PLATFORMS.includes(active as Platform) ? (active as Platform) : undefined,
    query
  );
  const products =
    active === "free" ? all.filter((p) => p.price_minor === 0) : all;

  // Show the slideshow only on the default storefront view.
  const showHero = active === "all" && !query;
  const featured = [...all].sort(
    (a, b) => b.rating_avg * b.rating_count - a.rating_avg * a.rating_count
  );

  return (
    <main className="max-w-5xl mx-auto px-5 py-6">
      <TopNav defaultQuery={query} />

      <h1 className="sr-only">
        DoyinSoft — software built for African markets
      </h1>

      {showHero ? (
        <HeroCarousel products={featured} />
      ) : (
        <section className="mb-5">
          <p className="text-[22px] font-medium m-0 mb-1">
            Software built for African markets
          </p>
          <p className="text-[14px] text-ink-soft m-0">
            Desktop, mobile and web apps from independent developers
          </p>
        </section>
      )}

      <FilterPills active={active === "free" ? "free" : active} />

      {query && (
        <p className="text-[12px] text-ink-soft mb-3">
          {products.length} result{products.length === 1 ? "" : "s"} for &ldquo;{query}&rdquo; ·{" "}
          <Link href="/" className="text-brand no-underline hover:underline">
            Clear
          </Link>
        </p>
      )}

      {/* Product grid */}
      <section
        className="grid gap-3"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}
      >
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </section>

      {products.length === 0 && (
        <p className="text-[13px] text-ink-soft mt-4">
          {query
            ? `No software matches “${query}”.`
            : "No software in this category yet."}
        </p>
      )}
    </main>
  );
}
