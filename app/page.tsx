import Link from "next/link";
import { TopNav } from "@/components/top-nav";
import { FilterPills } from "@/components/filter-pills";
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

  // Preserve other filters when switching category.
  const catHref = (c: string) => {
    const params = new URLSearchParams();
    if (active !== "all") params.set("platform", active);
    if (query) params.set("q", query);
    if (activeType !== "all") params.set("type", activeType);
    if (c) params.set("category", c);
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
        DoyinSoft — software built for African markets
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

      {/* Browse by type */}
      <div className="flex gap-2 flex-wrap mb-3">
        {TYPES.map((t) => (
          <Link
            key={t.value}
            href={typeHref(t.value)}
            className={[
              "text-[12px] px-3 py-[5px] rounded-md no-underline border transition-colors",
              activeType === t.value
                ? "border-brand text-brand bg-brand-tint font-medium"
                : "border-line text-ink-soft hover:border-line-strong hover:text-ink",
            ].join(" ")}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <FilterPills active={active === "free" ? "free" : active} />

      {/* Category filter */}
      {categories.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-4 -mt-1">
          <Link
            href={catHref("")}
            className={[
              "text-[12px] px-3 py-[5px] rounded-md no-underline border transition-colors",
              !activeCategory
                ? "border-brand text-brand bg-brand-tint font-medium"
                : "border-line text-ink-soft hover:border-line-strong hover:text-ink",
            ].join(" ")}
          >
            All categories
          </Link>
          {categories.map((c) => (
            <Link
              key={c}
              href={catHref(c)}
              className={[
                "text-[12px] px-3 py-[5px] rounded-md no-underline border transition-colors",
                activeCategory === c
                  ? "border-brand text-brand bg-brand-tint font-medium"
                  : "border-line text-ink-soft hover:border-line-strong hover:text-ink",
              ].join(" ")}
            >
              {c}
            </Link>
          ))}
        </div>
      )}

      {(query || activeCategory) && (
        <p className="text-[12px] text-ink-soft mb-3">
          {products.length} result{products.length === 1 ? "" : "s"}
          {query ? ` for “${query}”` : ""}
          {activeCategory ? ` in ${activeCategory}` : ""} ·{" "}
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

      <Footer />
    </main>
  );
}
