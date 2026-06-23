import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Star, Download, Package, Search } from "lucide-react";
import { Logo } from "@/components/logo";
import { Footer } from "@/components/footer";
import { ProductCard } from "@/components/product-card";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { getStoreProducts, getVendorBySlug } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { followerCount, isFollowing } from "@/lib/follows";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";
import { FollowButton } from "./follow";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://doyinsoft.vercel.app";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const vendor = await getVendorBySlug(slug);
  if (!vendor) return { title: "Store not found — DoyinMart" };
  const title = `${vendor.name} — store on DoyinMart`;
  return {
    title,
    description: `Shop ${vendor.name}'s products on DoyinMart.`,
    openGraph: { title, type: "website" },
  };
}

const TYPES = [
  { label: "All", value: "" },
  { label: "Digital", value: "digital" },
  { label: "Physical", value: "physical" },
  { label: "Services", value: "service" },
];

export default async function StorePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; type?: string; category?: string; sort?: string }>;
}) {
  const { slug } = await params;
  const { q, type, category, sort } = await searchParams;
  const vendor = await getVendorBySlug(slug);
  if (!vendor || vendor.suspended) notFound();

  const all = await getStoreProducts(vendor.id);
  const user = await getCurrentUser();
  const [following, followers] = await Promise.all([
    user ? isFollowing(vendor.id, user.id) : Promise.resolve(false),
    followerCount(vendor.id),
  ]);

  // Store stats (over the whole catalogue, not the filtered view).
  const totalDownloads = all.reduce((t, p) => t + p.download_count, 0);
  const rated = all.filter((p) => p.rating_count > 0);
  const ratingWeight = rated.reduce((t, p) => t + p.rating_count, 0);
  const avgRating = ratingWeight
    ? rated.reduce((t, p) => t + p.rating_avg * p.rating_count, 0) / ratingWeight
    : 0;
  const categories = [...new Set(all.map((p) => p.category).filter(Boolean))].sort();

  // Filter + sort the view.
  const query = q?.trim().toLowerCase() ?? "";
  let list = all.filter((p) => {
    if (type && p.product_type !== type) return false;
    if (category && p.category !== category) return false;
    if (query && !`${p.name} ${p.tagline} ${p.category}`.toLowerCase().includes(query)) return false;
    return true;
  });
  list = sortProducts(list, sort);

  // Spotlight the best product on the default (unfiltered) view.
  const spotlight =
    all.length > 2 && !query && !type && !category
      ? [...all].sort(
          (a, b) =>
            Number(b.featured) - Number(a.featured) ||
            b.rating_avg * b.rating_count - a.rating_avg * a.rating_count
        )[0]
      : null;
  const spotImage = spotlight?.icon_url || spotlight?.screenshots[0] || null;

  return (
    <main className="max-w-5xl mx-auto px-5 py-6">
      <header className="flex items-center justify-between border-b border-line pb-[14px] mb-6">
        <Logo />
        <Link href="/" className="text-[13px] text-ink-soft no-underline hover:text-ink">
          ← Marketplace
        </Link>
      </header>

      {/* Store banner */}
      <div className="rounded-lg overflow-hidden border border-line mb-6">
        {vendor.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={vendor.cover_url} alt="" className="w-full h-32 object-cover bg-muted block" />
        ) : (
          <div className="h-24 bg-brand" />
        )}
        <div className="px-5 pb-5 -mt-8">
          <div className="flex items-end gap-3 flex-wrap">
            <div className="w-16 h-16 rounded-full bg-white border border-line flex items-center justify-center text-[20px] font-medium text-brand shrink-0">
              {vendor.initials}
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <h1 className="text-[20px] font-medium m-0 inline-flex items-center gap-1">
                {vendor.name}
                {vendor.verified && <BadgeCheck size={16} className="text-success" />}
              </h1>
              <p className="text-[12px] text-ink-soft m-0">@{vendor.slug}</p>
            </div>
            <div className="flex gap-2 pb-1 flex-wrap">
              <FollowButton
                vendorId={vendor.id}
                initialFollowing={following}
                initialCount={followers}
                signedIn={Boolean(user)}
                signInHref={`/sign-in?next=/store/${vendor.slug}`}
              />
              {vendor.whatsapp && (
                <WhatsAppButton
                  phone={vendor.whatsapp}
                  text={`Hi ${vendor.name}, I found your store on DoyinMart.`}
                  label="Chat"
                />
              )}
              <WhatsAppButton
                text={`Check out ${vendor.name}'s store on DoyinMart — ${SITE_URL}/store/${vendor.slug}`}
                label="Share"
              />
            </div>
          </div>

          {vendor.bio && (
            <p className="text-[13px] text-ink-soft leading-[1.6] m-0 mt-3 max-w-2xl">{vendor.bio}</p>
          )}

          {/* Stat chips */}
          <div className="flex gap-2 flex-wrap mt-4">
            <span className="inline-flex items-center gap-1 text-[12px] text-ink-soft bg-muted rounded-md px-2.5 py-1">
              <Package size={12} /> {all.length} product{all.length === 1 ? "" : "s"}
            </span>
            {avgRating > 0 && (
              <span className="inline-flex items-center gap-1 text-[12px] text-ink-soft bg-muted rounded-md px-2.5 py-1">
                <Star size={12} className="text-brand fill-current" /> {avgRating.toFixed(1)} ({ratingWeight})
              </span>
            )}
            {totalDownloads > 0 && (
              <span className="inline-flex items-center gap-1 text-[12px] text-ink-soft bg-muted rounded-md px-2.5 py-1">
                <Download size={12} /> {totalDownloads.toLocaleString()} downloads
              </span>
            )}
            {vendor.verified && (
              <span className="inline-flex items-center gap-1 text-[12px] text-success bg-success-bg rounded-md px-2.5 py-1">
                <BadgeCheck size={12} /> Verified seller
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Spotlight */}
      {spotlight && (
        <Link
          href={`/products/${spotlight.slug}`}
          className="block border border-line rounded-lg overflow-hidden mb-5 no-underline text-ink hover:border-brand transition-colors"
        >
          <div className="flex items-center gap-4 p-4">
            {spotImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={spotImage} alt="" className="w-16 h-16 rounded-md object-cover bg-muted shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-md bg-muted shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <span className="text-[11px] uppercase tracking-wide text-brand font-medium">Spotlight</span>
              <p className="text-[15px] font-medium m-0">{spotlight.name}</p>
              <p className="text-[12px] text-ink-soft m-0 truncate">{spotlight.tagline}</p>
            </div>
            <span className="text-[15px] font-medium shrink-0">
              {formatPrice(spotlight.price_minor, spotlight.currency)}
            </span>
          </div>
        </Link>
      )}

      {/* Filter / search toolbar */}
      <form method="get" className="flex flex-wrap items-center gap-2 mb-5">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder={`Search ${vendor.name}…`}
            className="field w-full pl-8"
          />
        </div>
        {type ? <input type="hidden" name="type" value={type} /> : null}
        <select name="category" defaultValue={category ?? ""} className="field text-[12px] py-[7px] max-w-[160px]">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select name="sort" defaultValue={sort ?? ""} className="field text-[12px] py-[7px]">
          <option value="">Top rated</option>
          <option value="popular">Most downloaded</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
        </select>
        <button className="btn-primary px-4 py-2">Apply</button>
      </form>

      {/* Type segmented control (links, preserve query/sort) */}
      <div className="inline-flex rounded-md border border-line overflow-hidden mb-5">
        {TYPES.map((t) => {
          const params = new URLSearchParams();
          if (query) params.set("q", q!);
          if (category) params.set("category", category);
          if (sort) params.set("sort", sort);
          if (t.value) params.set("type", t.value);
          const href = `/store/${vendor.slug}${params.toString() ? `?${params}` : ""}`;
          const active = (type ?? "") === t.value;
          return (
            <Link
              key={t.value}
              href={href}
              className={[
                "text-[12px] px-3 py-[7px] no-underline border-r border-line last:border-r-0 transition-colors",
                active ? "bg-brand text-white font-medium" : "text-ink-soft hover:text-ink hover:bg-muted",
              ].join(" ")}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {list.length === 0 ? (
        <p className="text-[13px] text-ink-soft">
          {all.length === 0 ? "No products yet." : "No products match your filters."}
        </p>
      ) : (
        <section
          className="grid gap-3"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}
        >
          {list.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </section>
      )}

      <Footer />
    </main>
  );
}

function sortProducts(list: Product[], sort?: string): Product[] {
  const arr = [...list];
  switch (sort) {
    case "price-asc":
      return arr.sort((a, b) => a.price_minor - b.price_minor);
    case "price-desc":
      return arr.sort((a, b) => b.price_minor - a.price_minor);
    case "popular":
      return arr.sort((a, b) => b.download_count - a.download_count);
    default:
      return arr.sort((a, b) => b.rating_avg * b.rating_count - a.rating_avg * a.rating_count);
  }
}
