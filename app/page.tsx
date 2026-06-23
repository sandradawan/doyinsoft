import Link from "next/link";
import { TopNav } from "@/components/top-nav";
import { CategorySelect } from "@/components/category-select";
import { ProductCard } from "@/components/product-card";
import { HeroCarousel } from "@/components/hero-carousel";
import { Footer } from "@/components/footer";
import { getCategories, getProducts } from "@/lib/data";
import type { Platform, ProductType } from "@/lib/types";

const PLATFORMS: Platform[] = ["desktop", "mobile", "web"];
const TYPES: { label: string; value: ProductType | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Digital", value: "digital" },
  { label: "Physical", value: "physical" },
  { label: "Services", value: "service" },
];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string; q?: string; category?: string; type?: string }>;
}) {
  const { platform, q, category, type } = await searchParams;
  const active = (platform as Platform | "all") ?? "all";
  const query = q?.trim() ?? "";
  const activeCategory = category?.trim() ?? "";
  const activeType = (["digital", "physical", "service"].includes(type ?? "")
    ? type
    : "all") as ProductType | "all";

  // "Free" is a price filter, not a platform; everything else filters by platform.
  const [all, categories] = await Promise.all([
    getProducts(
      PLATFORMS.includes(active as Platform) ? (active as Platform) : undefined,
      query,
      activeCategory || undefined,
      activeType === "all" ? undefined : activeType
    ),
    getCategories(),
  ]);
  const products =
    active === "free" ? all.filter((p) => p.price_minor === 0) : all;

  // Show the slideshow only on the default storefront view.
  const showHero = active === "all" && !query && !activeCategory && activeType === "all";

  const typeHref = (t: string) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (activeCategory) params.set("category", activeCategory);
    if (t !== "all") params.set("type", t);
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  };

  // Prefer admin-featured products; fall back to top-rated if none are featured.
  const featuredFlagged = all.filter((p) => p.featured);
  const featured = (
    featuredFlagged.length
      ? featuredFlagged
      : [...all].sort((a, b) => b.rating_avg * b.rating_count - a.rating_avg * a.rating_count)
  ).slice(0, 6);

  return (
    <main className="max-w-5xl mx-auto px-5 py-6">
      <TopNav defaultQuery={query} />

      <h1 className="sr-only">
        DoyinMart — software built for African markets
      </h1>

      {showHero ? (
        <HeroCarousel products={featured} />
      ) : (
        <section className="mb-5">
          <p className="text-[22px] font-medium m-0 mb-1">
            Built for African markets
          </p>
          <p className="text-[14px] text-ink-soft m-0">
            Software, digital products, fashion & more from independent sellers
          </p>
        </section>
      )}

      {/* Toolbar: type segmented control + category dropdown */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
        <div className="inline-flex rounded-md border border-line overflow-hidden">
          {TYPES.map((t) => (
            <Link
              key={t.value}
              href={typeHref(t.value)}
              className={[
                "text-[12px] px-3 py-[7px] no-underline border-r border-line last:border-r-0 transition-colors",
                activeType === t.value
                  ? "bg-brand text-white font-medium"
                  : "text-ink-soft hover:text-ink hover:bg-muted",
              ].join(" ")}
            >
              {t.label}
            </Link>
          ))}
        </div>
        {categories.length > 0 && (
          <CategorySelect categories={categories} value={activeCategory} type={activeType} q={query} />
        )}
      </div>

      {(query || activeCategory) && (
        <div className="flex items-center justify-between mb-4">
          <p className="text-[14px] font-medium m-0">
            {products.length} result{products.length === 1 ? "" : "s"}
            {query ? ` for “${query}”` : ""}
            {activeCategory ? ` in ${activeCategory}` : ""}
          </p>
          <Link href="/" className="text-[12px] text-brand no-underline hover:underline">
            Clear filters
          </Link>
        </div>
      )}

      {/* Product grid */}
      <section
        className="grid gap-3"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}
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

      <Footer />
    </main>
  );
}
