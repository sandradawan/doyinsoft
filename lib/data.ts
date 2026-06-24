// Data access layer. Every page imports from here.
//
// If Supabase is configured (env set), these run real queries.
// Otherwise they return the built-in seed data so the UI is fully navigable
// with zero backend setup. Swapping in Supabase requires no page changes.

import { createClient } from "./supabase/server";
import { createAdminClient } from "./supabase/admin";
import { hasServiceRole, isSupabaseConfigured } from "./supabase/env";
import { deterministicLicenseKey, generateLicenseKey } from "./license";
import { emailButton, emailKeyBox, emailLayout, emailText, esc, sendEmail, subjectSafe } from "./email";
import { getSettings } from "./settings";
import { incrementCouponUse } from "./coupons";
import { redeemGiftCard } from "./giftcards";
import { affiliateOwnsEmail } from "./affiliate";
import { formatPrice } from "./format";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
import {
  dashboardMetrics as seedMetrics,
  orders as seedOrders,
  payoutDetails as seedPayoutDetails,
  payouts as seedPayouts,
  payoutSummary as seedPayoutSummary,
  products as seedProducts,
  reviews as seedReviews,
  vendors as seedVendors,
} from "./seed-data";
import type {
  DashboardMetrics,
  License,
  Order,
  OrderStatus,
  Payout,
  PayoutDetails,
  PayoutSummary,
  Platform,
  Product,
  ProductStatus,
  ProductType,
  Review,
  Vendor,
} from "./types";

// The seed vendor whose dashboard we show until real auth is wired.
export const DEMO_VENDOR_ID = "v_adeyemi";

// ---- Row shapes returned by Supabase (snake_case, joined vendor) -------------

interface VendorRow {
  id: string;
  slug: string;
  name: string;
  initials: string;
  verified: boolean;
  suspended?: boolean;
  whatsapp?: string | null;
  bio?: string | null;
  cover_url?: string | null;
}

interface ProductRow {
  id: string;
  slug: string;
  name: string;
  price_minor: number;
  currency: "NGN" | "USD";
  platform: Platform;
  category: string;
  tagline: string;
  description: string;
  system_requirements: string;
  os_badges: string[];
  version: string;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  download_count: number;
  rating_avg: number | null;
  rating_count: number | null;
  icon_url: string | null;
  screenshots: string[] | null;
  status: "pending" | "approved" | "rejected" | null;
  featured: boolean | null;
  rejection_reason: string | null;
  launched_at: string | null;
  upvotes: number | null;
  product_type: "digital" | "physical" | "service" | null;
  vendor: VendorRow | VendorRow[] | null;
}

function mapVendor(v: VendorRow): Vendor {
  return {
    id: v.id,
    slug: v.slug,
    name: v.name,
    initials: v.initials,
    verified: v.verified,
    suspended: v.suspended ?? false,
    whatsapp: v.whatsapp ?? null,
    bio: v.bio ?? null,
    cover_url: v.cover_url ?? null,
  };
}

function mapProduct(row: ProductRow): Product {
  const v = Array.isArray(row.vendor) ? row.vendor[0] : row.vendor;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    price_minor: row.price_minor,
    currency: row.currency,
    platform: row.platform,
    category: row.category,
    tagline: row.tagline,
    description: row.description,
    system_requirements: row.system_requirements,
    os_badges: row.os_badges ?? [],
    version: row.version ?? "1.0.0",
    file_path: row.file_path ?? null,
    file_name: row.file_name ?? null,
    file_size: row.file_size ?? null,
    download_count: row.download_count ?? 0,
    rating_avg: Number(row.rating_avg ?? 0),
    rating_count: row.rating_count ?? 0,
    icon_url: row.icon_url ?? null,
    screenshots: row.screenshots ?? [],
    status: row.status ?? "approved",
    featured: row.featured ?? false,
    rejection_reason: row.rejection_reason ?? null,
    launched_at: row.launched_at ?? null,
    upvotes: row.upvotes ?? 0,
    product_type: row.product_type ?? "digital",
    vendor: v
      ? mapVendor(v)
      : { id: "", slug: "", name: "Unknown vendor", initials: "?", verified: false },
  };
}

const PRODUCT_SELECT =
  "id, slug, name, price_minor, currency, platform, category, tagline, description, system_requirements, os_badges, version, file_path, file_name, file_size, download_count, rating_avg, rating_count, icon_url, screenshots, status, featured, rejection_reason, launched_at, upvotes, product_type, vendor:vendors(id, slug, name, initials, verified, suspended, whatsapp)";

// Columns guaranteed to exist since the first migration. Used as a fallback so
// a not-yet-run migration can never empty the storefront.
const CORE_SELECT =
  "id, slug, name, price_minor, currency, platform, category, tagline, description, system_requirements, os_badges, vendor:vendors(id, slug, name, initials, verified)";

const ORDER_SELECT =
  "id, buyer_name, buyer_initials, amount_minor, currency, status, gateway, created_at, reference, fulfilment_status, shipping_name, shipping_phone, shipping_address, buyer_email, product:products(id, name, slug, price_minor, currency, product_type)";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Strip PostgREST filter-grammar and ilike-wildcard characters from user search
 * input before it's interpolated into a `.or(...)` / `.ilike(...)` string.
 * Prevents filter injection (e.g. `x),status.eq.draft`) that could broaden a query.
 */
export function sanitizeLike(q: string): string {
  return q.replace(/[%,()*:\\]/g, " ").replace(/\s+/g, " ").trim();
}

// Add a search filter to an orders query: email + payment reference (+ order id
// when the query looks like a UUID).
function applyOrderSearch<T extends { or: (f: string) => T }>(query: T, q: string): T {
  const safe = sanitizeLike(q);
  const like = `%${safe}%`;
  const parts = [`reference.ilike.${like}`, `buyer_email.ilike.${like}`];
  if (UUID_RE.test(q)) parts.unshift(`id.eq.${q}`);
  return query.or(parts.join(","));
}

function seedOrderMatch(o: Order, q: string): boolean {
  const s = q.toLowerCase();
  return (
    o.id.toLowerCase().includes(s) ||
    (o.reference ?? "").toLowerCase().includes(s) ||
    (o.buyer_email ?? "").toLowerCase().includes(s) ||
    o.buyer_name.toLowerCase().includes(s)
  );
}

// ---- Public queries ----------------------------------------------------------

export async function getProducts(
  platform?: Platform,
  search?: string,
  category?: string,
  productType?: ProductType
): Promise<Product[]> {
  const q = search?.trim().toLowerCase();
  const cat = category?.trim();

  if (!isSupabaseConfigured) {
    let list = (platform ? seedProducts.filter((p) => p.platform === platform) : seedProducts)
      .filter((p) => p.status === "approved");
    if (cat) list = list.filter((p) => p.category === cat);
    if (productType) list = list.filter((p) => p.product_type === productType);
    if (q) {
      list = list.filter((p) =>
        [p.name, p.tagline, p.category, p.vendor.name]
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }
    return list;
  }

  const supabase = await createClient();
  let query = supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("status", "approved")
    .order("name");
  if (platform) query = query.eq("platform", platform);
  if (cat) query = query.eq("category", cat);
  if (productType) query = query.eq("product_type", productType);
  if (q) {
    const like = `%${sanitizeLike(q)}%`;
    query = query.or(`name.ilike.${like},tagline.ilike.${like},category.ilike.${like}`);
  }
  const { data, error } = await query;
  if (!error) {
    return ((data as unknown as ProductRow[]) ?? [])
      .map(mapProduct)
      .filter((p) => !p.vendor.suspended);
  }

  // A column may be missing if a migration hasn't been run — retry with the
  // core columns only so the storefront still works.
  console.error("getProducts (full select failed, using core):", error.message);
  let fb = supabase.from("products").select(CORE_SELECT).order("name");
  if (platform) fb = fb.eq("platform", platform);
  if (cat) fb = fb.eq("category", cat);
  if (q) {
    const like = `%${sanitizeLike(q)}%`;
    fb = fb.or(`name.ilike.${like},tagline.ilike.${like},category.ilike.${like}`);
  }
  const res = await fb;
  if (res.error) {
    console.error("getProducts (core select failed):", res.error.message);
    return [];
  }
  return ((res.data as unknown as ProductRow[]) ?? [])
    .map(mapProduct)
    .filter((p) => !p.vendor.suspended);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (!isSupabaseConfigured) {
    const p = seedProducts.find((x) => x.slug === slug);
    return p && p.status === "approved" ? p : null;
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("slug", slug)
    .eq("status", "approved")
    .maybeSingle();
  if (!error) {
    if (!data) return null;
    const product = mapProduct(data as unknown as ProductRow);
    return product.vendor.suspended ? null : product;
  }

  // Fallback to core columns if a migration is pending.
  console.error("getProductBySlug (full select failed, using core):", error.message);
  const res = await supabase
    .from("products")
    .select(CORE_SELECT)
    .eq("slug", slug)
    .maybeSingle();
  if (res.error || !res.data) return null;
  return mapProduct(res.data as unknown as ProductRow);
}

// ---- Vendor storefronts ------------------------------------------------------

export interface StoreCard {
  slug: string;
  name: string;
  initials: string;
  verified: boolean;
  bio: string | null;
  cover_url: string | null;
  products: number;
  downloads: number;
  followers: number;
}

/** Stores (non-suspended) with product/download/follower counts + bio + cover. */
export async function getStoresWithDetails(): Promise<StoreCard[]> {
  const products = await getProducts();
  const agg = new Map<
    string,
    { id: string; slug: string; name: string; initials: string; verified: boolean; products: number; downloads: number }
  >();
  for (const p of products) {
    if (p.vendor.suspended) continue;
    const e =
      agg.get(p.vendor.slug) ??
      {
        id: p.vendor.id,
        slug: p.vendor.slug,
        name: p.vendor.name,
        initials: p.vendor.initials,
        verified: p.vendor.verified,
        products: 0,
        downloads: 0,
      };
    e.products += 1;
    e.downloads += p.download_count;
    agg.set(p.vendor.slug, e);
  }
  const stores = [...agg.values()];
  if (stores.length === 0) return [];
  const ids = stores.map((s) => s.id);

  // Enrich with bio/cover + follower counts (service-role, server-side; resilient).
  const extra = new Map<string, { bio: string | null; cover_url: string | null }>();
  const followers = new Map<string, number>();
  if (hasServiceRole) {
    try {
      const admin = createAdminClient();
      const [{ data: v }, { data: f }] = await Promise.all([
        admin.from("vendors").select("id, bio, cover_url").in("id", ids),
        admin.from("follows").select("vendor_id").in("vendor_id", ids),
      ]);
      for (const row of (v as { id: string; bio: string | null; cover_url: string | null }[]) ?? []) {
        extra.set(row.id, { bio: row.bio ?? null, cover_url: row.cover_url ?? null });
      }
      for (const row of (f as { vendor_id: string }[]) ?? []) {
        followers.set(row.vendor_id, (followers.get(row.vendor_id) ?? 0) + 1);
      }
    } catch {
      // older schema / unavailable — fall back to no bio/cover/followers
    }
  }

  return stores
    .map((s) => ({
      slug: s.slug,
      name: s.name,
      initials: s.initials,
      verified: s.verified,
      products: s.products,
      downloads: s.downloads,
      followers: followers.get(s.id) ?? 0,
      bio: extra.get(s.id)?.bio ?? null,
      cover_url: extra.get(s.id)?.cover_url ?? null,
    }))
    .sort((a, b) => b.followers - a.followers || b.downloads - a.downloads);
}

export async function getVendorBySlug(slug: string): Promise<Vendor | null> {
  if (!isSupabaseConfigured) return seedVendors.find((v) => v.slug === slug) ?? null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendors")
    .select("id, slug, name, initials, verified, suspended, whatsapp, bio, cover_url")
    .eq("slug", slug)
    .maybeSingle();
  if (!error) return data ? mapVendor(data as VendorRow) : null;

  // bio/cover_url may not exist yet (migration pending) — fall back to core.
  const res = await supabase
    .from("vendors")
    .select("id, slug, name, initials, verified, suspended, whatsapp")
    .eq("slug", slug)
    .maybeSingle();
  return res.data ? mapVendor(res.data as VendorRow) : null;
}

export async function getStoreProducts(vendorId: string): Promise<Product[]> {
  if (!isSupabaseConfigured) {
    return seedProducts.filter((p) => p.vendor.id === vendorId && p.status === "approved");
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("vendor_id", vendorId)
    .eq("status", "approved")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as unknown as ProductRow[]).map(mapProduct);
}

export async function getRecentOrders(vendorId = DEMO_VENDOR_ID): Promise<Order[]> {
  if (!isSupabaseConfigured) {
    return seedOrders;
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, buyer_name, buyer_initials, amount_minor, currency, status, gateway, created_at, fulfilment_status, shipping_name, shipping_phone, shipping_address, buyer_email, product:products(id, name, slug, price_minor, currency, product_type)"
    )
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) {
    console.error("getRecentOrders:", error.message);
    return [];
  }
  return (data as unknown as Order[]) ?? [];
}

function startOfTodayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** Paid sales for this vendor since midnight (today). */
export async function vendorTodayStats(
  vendorId = DEMO_VENDOR_ID
): Promise<{ revenue_minor: number; count: number }> {
  if (!hasServiceRole) return { revenue_minor: 0, count: 0 };
  const { data } = await createAdminClient()
    .from("orders")
    .select("amount_minor")
    .eq("vendor_id", vendorId)
    .eq("status", "paid")
    .gte("created_at", startOfTodayISO());
  const rows = (data as { amount_minor: number }[]) ?? [];
  return { revenue_minor: rows.reduce((t, r) => t + (r.amount_minor || 0), 0), count: rows.length };
}

export async function getDashboardMetrics(
  vendorId = DEMO_VENDOR_ID
): Promise<DashboardMetrics> {
  if (!isSupabaseConfigured) {
    return seedMetrics;
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("vendor_metrics_30d", {
    p_vendor_id: vendorId,
  });
  if (error || !data) {
    if (error) console.error("getDashboardMetrics:", error.message);
    return { revenue_minor: 0, units_sold: 0, pending_payout_minor: 0, currency: "NGN" };
  }
  // RPC returns a single row matching DashboardMetrics.
  return (Array.isArray(data) ? data[0] : data) as DashboardMetrics;
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  if (!isSupabaseConfigured) {
    return seedOrders.find((o) => o.id === orderId) ?? seedOrders[0] ?? null;
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, buyer_name, buyer_initials, amount_minor, currency, status, gateway, created_at, fulfilment_status, shipping_name, shipping_phone, shipping_address, buyer_email, gift_card_minor, product:products(id, name, slug, price_minor, currency, product_type)"
    )
    .eq("id", orderId)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as Order;
}

/**
 * Authoritative order amount via the service role (RLS-independent) — used by the
 * payment webhook and recovery tool to verify the charged amount matches.
 */
export async function getOrderAmount(
  orderId: string
): Promise<{ amount_minor: number; currency: "NGN" | "USD"; status: string; gift_card_minor: number } | null> {
  if (!hasServiceRole) return null;
  const { data } = await createAdminClient()
    .from("orders")
    .select("amount_minor, currency, status, gift_card_minor")
    .eq("id", orderId)
    .maybeSingle();
  return (
    (data as { amount_minor: number; currency: "NGN" | "USD"; status: string; gift_card_minor: number }) ?? null
  );
}

// ---- Analytics ---------------------------------------------------------------

export interface MonthPoint {
  label: string;
  revenue_minor: number;
  orders: number;
}

function lastMonths(n: number): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString("en-NG", { month: "short" }),
    });
  }
  return out;
}

function bucketOrders(
  months: { key: string; label: string }[],
  rows: { created_at: string; amount_minor: number }[]
): MonthPoint[] {
  const rev = new Map<string, number>();
  const cnt = new Map<string, number>();
  for (const o of rows) {
    const d = new Date(o.created_at);
    const k = `${d.getFullYear()}-${d.getMonth()}`;
    rev.set(k, (rev.get(k) ?? 0) + (o.amount_minor || 0));
    cnt.set(k, (cnt.get(k) ?? 0) + 1);
  }
  return months.map((m) => ({
    label: m.label,
    revenue_minor: rev.get(m.key) ?? 0,
    orders: cnt.get(m.key) ?? 0,
  }));
}

function mockMonthly(months: { key: string; label: string }[]): MonthPoint[] {
  const rev = [5_000_000, 7_500_000, 9_000_000, 12_000_000, 15_500_000, 19_000_000];
  const ord = [3, 5, 6, 8, 11, 14];
  return months.map((m, i) => ({
    label: m.label,
    revenue_minor: rev[i] ?? 0,
    orders: ord[i] ?? 0,
  }));
}

async function monthlyStats(vendorId?: string): Promise<MonthPoint[]> {
  const months = lastMonths(6);
  if (!hasServiceRole) return mockMonthly(months);
  const admin = createAdminClient();
  const since = new Date();
  since.setMonth(since.getMonth() - 5);
  since.setDate(1);
  let q = admin
    .from("orders")
    .select("created_at, amount_minor")
    .eq("status", "paid")
    .gte("created_at", since.toISOString());
  if (vendorId) q = q.eq("vendor_id", vendorId);
  const { data } = await q;
  return bucketOrders(months, (data as { created_at: string; amount_minor: number }[]) ?? []);
}

export async function adminMonthlyStats(): Promise<MonthPoint[]> {
  return monthlyStats();
}

export async function vendorMonthlyStats(vendorId = DEMO_VENDOR_ID): Promise<MonthPoint[]> {
  return monthlyStats(vendorId);
}

export async function vendorTopProducts(
  vendorId = DEMO_VENDOR_ID
): Promise<{ label: string; value: number }[]> {
  if (!hasServiceRole) {
    return seedProducts
      .filter((p) => p.vendor.id === vendorId)
      .map((p) => ({ label: p.name, value: p.price_minor * Math.max(1, p.rating_count) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }
  const admin = createAdminClient();
  const { data } = await admin
    .from("orders")
    .select("amount_minor, product:products(name)")
    .eq("vendor_id", vendorId)
    .eq("status", "paid");
  const totals = new Map<string, number>();
  for (const row of (data as { amount_minor: number; product: { name: string } | { name: string }[] | null }[]) ?? []) {
    const p = Array.isArray(row.product) ? row.product[0] : row.product;
    const name = p?.name ?? "Unknown";
    totals.set(name, (totals.get(name) ?? 0) + (row.amount_minor || 0));
  }
  return [...totals.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
}

// ---- Categories --------------------------------------------------------------

const DEFAULT_CATEGORIES = [
  "Design tools", "Support", "Logistics", "Finance", "Commerce",
  "Productivity", "Developer tools", "Security", "Education", "Media",
];

export async function getCategories(): Promise<string[]> {
  if (!hasServiceRole) return DEFAULT_CATEGORIES;
  const admin = createAdminClient();
  const { data } = await admin.from("categories").select("name").order("name");
  const names = ((data as { name: string }[]) ?? []).map((c) => c.name);
  return names.length ? names : DEFAULT_CATEGORIES;
}

export async function adminCategories(): Promise<{ id: string; name: string }[]> {
  if (!hasServiceRole) return DEFAULT_CATEGORIES.map((name, i) => ({ id: String(i), name }));
  const admin = createAdminClient();
  const { data } = await admin.from("categories").select("id, name").order("name");
  return (data as { id: string; name: string }[]) ?? [];
}

// ---- Admin queries (service role) --------------------------------------------

export const ADMIN_PAGE_SIZE = 4;

export async function adminProducts(
  status?: ProductStatus,
  page = 1,
  search?: string
): Promise<{ items: Product[]; total: number }> {
  const q = search?.trim().toLowerCase();
  if (!hasServiceRole) {
    let all = status ? seedProducts.filter((p) => p.status === status) : seedProducts;
    if (q) all = all.filter((p) => `${p.name} ${p.slug}`.toLowerCase().includes(q));
    const start = (page - 1) * ADMIN_PAGE_SIZE;
    return { items: all.slice(start, start + ADMIN_PAGE_SIZE), total: all.length };
  }
  const admin = createAdminClient();
  const from = (page - 1) * ADMIN_PAGE_SIZE;
  let query = admin
    .from("products")
    .select(PRODUCT_SELECT, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + ADMIN_PAGE_SIZE - 1);
  if (status) query = query.eq("status", status);
  if (q) query = query.or(`name.ilike.%${sanitizeLike(q)}%,slug.ilike.%${sanitizeLike(q)}%`);
  const { data, error, count } = await query;
  if (error || !data) return { items: [], total: 0 };
  return { items: (data as unknown as ProductRow[]).map(mapProduct), total: count ?? 0 };
}

export async function adminVendors(search?: string): Promise<Vendor[]> {
  const q = search?.trim().toLowerCase();
  if (!hasServiceRole) {
    return q
      ? seedVendors.filter((v) => `${v.name} ${v.slug}`.toLowerCase().includes(q))
      : seedVendors;
  }
  const admin = createAdminClient();
  let query = admin
    .from("vendors")
    .select("id, slug, name, initials, verified, suspended")
    .order("created_at", { ascending: false });
  if (q) query = query.or(`name.ilike.%${sanitizeLike(q)}%,slug.ilike.%${sanitizeLike(q)}%`);
  const { data } = await query;
  return (data as Vendor[]) ?? [];
}

/** Any product by id (admin) — ignores status, for the review screen. */
export async function adminProductById(id: string): Promise<Product | null> {
  if (!hasServiceRole) return seedProducts.find((p) => p.id === id) ?? null;
  const admin = createAdminClient();
  const { data } = await admin.from("products").select(PRODUCT_SELECT).eq("id", id).maybeSingle();
  return data ? mapProduct(data as unknown as ProductRow) : null;
}

export interface AdminReview extends Review {
  product_name: string;
}

export async function adminReviews(
  page = 1,
  search?: string
): Promise<{ items: AdminReview[]; total: number }> {
  const q = search?.trim().toLowerCase();
  if (!hasServiceRole) {
    let all = seedReviews.map((r) => ({
      ...r,
      product_name: seedProducts.find((p) => p.id === r.product_id)?.name ?? "—",
    }));
    if (q) all = all.filter((r) => `${r.author_name} ${r.body}`.toLowerCase().includes(q));
    const start = (page - 1) * ADMIN_PAGE_SIZE;
    return { items: all.slice(start, start + ADMIN_PAGE_SIZE), total: all.length };
  }
  const admin = createAdminClient();
  const from = (page - 1) * ADMIN_PAGE_SIZE;
  let query = admin
    .from("reviews")
    .select("id, product_id, author_name, rating, body, created_at, product:products(name)", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(from, from + ADMIN_PAGE_SIZE - 1);
  if (q) query = query.or(`author_name.ilike.%${sanitizeLike(q)}%,body.ilike.%${sanitizeLike(q)}%`);
  const { data, count } = await query;
  const items = (
    (data as (Review & { product: { name: string } | { name: string }[] | null })[]) ?? []
  ).map((r) => {
    const p = Array.isArray(r.product) ? r.product[0] : r.product;
    return {
      id: r.id,
      product_id: r.product_id,
      author_name: r.author_name,
      rating: r.rating,
      body: r.body,
      created_at: r.created_at,
      product_name: p?.name ?? "—",
    };
  });
  return { items, total: count ?? 0 };
}

export const ADMIN_ORDERS_PAGE_SIZE = 4;

export async function adminOrders(
  status?: OrderStatus,
  page = 1,
  search?: string,
  pageSize = ADMIN_ORDERS_PAGE_SIZE
): Promise<OrdersPage> {
  const s = search?.trim();
  if (!hasServiceRole) {
    let list = status ? seedOrders.filter((o) => o.status === status) : seedOrders;
    if (s) list = list.filter((o) => seedOrderMatch(o, s));
    const start = (page - 1) * pageSize;
    return { items: list.slice(start, start + pageSize), total: list.length };
  }
  const admin = createAdminClient();
  const from = (page - 1) * pageSize;
  let q = admin
    .from("orders")
    .select(ORDER_SELECT, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);
  if (status) q = q.eq("status", status);
  if (s) q = applyOrderSearch(q, s);
  const { data, count } = await q;
  return { items: (data as unknown as Order[]) ?? [], total: count ?? 0 };
}

export async function adminStats(): Promise<{
  pending: number;
  products: number;
  vendors: number;
  revenue_minor: number;
  orders: number;
}> {
  if (!hasServiceRole) {
    return {
      pending: 0,
      products: seedProducts.length,
      vendors: seedVendors.length,
      revenue_minor: seedMetrics.revenue_minor,
      orders: seedOrders.length,
    };
  }
  const admin = createAdminClient();
  const [pending, products, vendors, paid, orders] = await Promise.all([
    admin.from("products").select("id", { count: "exact", head: true }).eq("status", "pending"),
    admin.from("products").select("id", { count: "exact", head: true }),
    admin.from("vendors").select("id", { count: "exact", head: true }),
    admin.from("orders").select("amount_minor").eq("status", "paid"),
    admin.from("orders").select("id", { count: "exact", head: true }),
  ]);
  const revenue = ((paid.data as { amount_minor: number }[]) ?? []).reduce(
    (t, r) => t + (r.amount_minor || 0),
    0
  );
  return {
    pending: pending.count ?? 0,
    products: products.count ?? 0,
    vendors: vendors.count ?? 0,
    revenue_minor: revenue,
    orders: orders.count ?? 0,
  };
}

/** The auth email of a vendor's owner — for approval/rejection notifications. */
export async function getVendorOwnerEmail(vendorId: string): Promise<string | null> {
  if (!hasServiceRole) return null;
  const admin = createAdminClient();
  const { data: vendor } = await admin
    .from("vendors")
    .select("owner")
    .eq("id", vendorId)
    .maybeSingle();
  const ownerId = (vendor as { owner?: string } | null)?.owner;
  if (!ownerId) return null;
  const { data } = await admin.auth.admin.getUserById(ownerId);
  return data?.user?.email ?? null;
}

// ---- Vendor products ---------------------------------------------------------

export async function getVendorProducts(vendorId = DEMO_VENDOR_ID): Promise<Product[]> {
  if (!isSupabaseConfigured) {
    return seedProducts.filter((p) => p.vendor.id === vendorId);
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("vendor_id", vendorId)
    .order("name");
  if (error || !data) return [];
  return (data as unknown as ProductRow[]).map(mapProduct);
}

/** Recent approved products from a set of vendors (for the Following feed). */
export async function getProductsByVendorIds(ids: string[], limit = 12): Promise<Product[]> {
  if (ids.length === 0) return [];
  if (!isSupabaseConfigured) {
    return seedProducts.filter((p) => ids.includes(p.vendor.id) && p.status === "approved");
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .in("vendor_id", ids)
    .eq("status", "approved")
    .order("launched_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as unknown as ProductRow[]).map(mapProduct).filter((p) => !p.vendor.suspended);
}

/** Load approved products by id (preserves the given order). Used by wishlist. */
export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0 || !isSupabaseConfigured) {
    return ids.map((id) => seedProducts.find((p) => p.id === id)).filter((p): p is Product => Boolean(p));
  }
  const supabase = await createClient();
  const { data } = await supabase.from("products").select(PRODUCT_SELECT).in("id", ids).eq("status", "approved");
  const byId = new Map(
    ((data as unknown as ProductRow[]) ?? []).map(mapProduct).filter((p) => !p.vendor.suspended).map((p) => [p.id, p])
  );
  return ids.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p));
}

/** Load one of the vendor's products by id, enforcing ownership. */
export async function getVendorProductById(
  id: string,
  vendorId: string
): Promise<Product | null> {
  if (!isSupabaseConfigured) {
    return seedProducts.find((p) => p.id === id && p.vendor.id === vendorId) ?? null;
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("id", id)
    .eq("vendor_id", vendorId)
    .maybeSingle();
  if (error || !data) return null;
  return mapProduct(data as unknown as ProductRow);
}

// ---- Vendor orders -----------------------------------------------------------

export interface OrdersPage {
  items: Order[];
  total: number;
}

export async function getVendorOrders(
  vendorId = DEMO_VENDOR_ID,
  opts: { status?: OrderStatus; page?: number; pageSize?: number; search?: string } = {}
): Promise<OrdersPage> {
  const pageSize = opts.pageSize ?? 10;
  const page = Math.max(1, opts.page ?? 1);
  const search = opts.search?.trim();

  if (!isSupabaseConfigured) {
    let list = opts.status ? seedOrders.filter((o) => o.status === opts.status) : seedOrders;
    if (search) list = list.filter((o) => seedOrderMatch(o, search));
    const start = (page - 1) * pageSize;
    return { items: list.slice(start, start + pageSize), total: list.length };
  }

  const supabase = await createClient();
  const from = (page - 1) * pageSize;
  let query = supabase
    .from("orders")
    .select(ORDER_SELECT, { count: "exact" })
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);
  if (opts.status) query = query.eq("status", opts.status);
  if (search) query = applyOrderSearch(query, search);
  const { data, error, count } = await query;
  if (error || !data) return { items: [], total: 0 };
  return { items: data as unknown as Order[], total: count ?? 0 };
}

// ---- Payouts -----------------------------------------------------------------

export async function getPayoutSummary(
  vendorId = DEMO_VENDOR_ID
): Promise<PayoutSummary> {
  if (!isSupabaseConfigured) return seedPayoutSummary;
  const supabase = await createClient();
  // Lifetime paid revenue.
  const { data: paidOrders } = await supabase
    .from("orders")
    .select("amount_minor")
    .eq("vendor_id", vendorId)
    .eq("status", "paid");
  const { data: pendingOrders } = await supabase
    .from("orders")
    .select("amount_minor")
    .eq("vendor_id", vendorId)
    .eq("status", "pending");
  const { data: paidOuts } = await supabase
    .from("payouts")
    .select("amount_minor")
    .eq("vendor_id", vendorId)
    .in("status", ["paid", "requested"]);

  const sum = (rows: { amount_minor: number }[] | null) =>
    (rows ?? []).reduce((t, r) => t + r.amount_minor, 0);

  const revenue = sum(paidOrders);
  const withdrawn = sum(paidOuts);
  return {
    available_minor: Math.max(0, revenue - withdrawn),
    pending_minor: sum(pendingOrders),
    paid_out_minor: withdrawn,
    currency: "NGN",
  };
}

export async function getPayouts(vendorId = DEMO_VENDOR_ID): Promise<Payout[]> {
  if (!isSupabaseConfigured) return seedPayouts;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payouts")
    .select("id, amount_minor, currency, status, method, reference, created_at, paid_at")
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as unknown as Payout[];
}

export async function getVendorSubaccount(
  vendorId = DEMO_VENDOR_ID
): Promise<{ connected: boolean; account_number: string | null; bank_code: string | null }> {
  if (!hasServiceRole) return { connected: false, account_number: null, bank_code: null };
  const admin = createAdminClient();
  const { data } = await admin
    .from("vendors")
    .select("subaccount_code, payout_account_number, payout_bank_code")
    .eq("id", vendorId)
    .maybeSingle();
  return {
    connected: Boolean(data?.subaccount_code),
    account_number: data?.payout_account_number ?? null,
    bank_code: data?.payout_bank_code ?? null,
  };
}

/** Subaccount code used to split a checkout payment to the vendor. */
export async function getVendorSubaccountCode(vendorId: string): Promise<string | null> {
  if (!hasServiceRole) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("vendors")
    .select("subaccount_code")
    .eq("id", vendorId)
    .maybeSingle();
  return (data?.subaccount_code as string | null) ?? null;
}

export async function getPayoutDetails(
  vendorId = DEMO_VENDOR_ID
): Promise<PayoutDetails> {
  if (!isSupabaseConfigured) return seedPayoutDetails;
  const supabase = await createClient();
  const { data } = await supabase
    .from("vendors")
    .select("payout_bank, payout_account_name, payout_account_number")
    .eq("id", vendorId)
    .maybeSingle();
  return {
    bank: data?.payout_bank ?? "",
    account_name: data?.payout_account_name ?? "",
    account_number: data?.payout_account_number ?? "",
  };
}

// ---- Launches ----------------------------------------------------------------

export type LaunchPeriod = "today" | "week" | "all";

export async function getLaunches(period: LaunchPeriod = "week"): Promise<Product[]> {
  if (!isSupabaseConfigured) {
    return [...seedProducts]
      .filter((p) => p.status === "approved")
      .sort((a, b) => b.upvotes - a.upvotes);
  }

  const since = new Date();
  if (period === "today") since.setHours(0, 0, 0, 0);
  else if (period === "week") since.setDate(since.getDate() - 7);

  const supabase = await createClient();
  let query = supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("status", "approved")
    .not("launched_at", "is", null)
    .order("upvotes", { ascending: false })
    .order("launched_at", { ascending: false })
    .limit(50);
  if (period !== "all") query = query.gte("launched_at", since.toISOString());

  const { data, error } = await query;
  if (error || !data) return [];
  return (data as unknown as ProductRow[]).map(mapProduct).filter((p) => !p.vendor.suspended);
}

/** Product ids the given voter has already upvoted (to highlight the button). */
export async function getMyUpvotes(voter: string): Promise<Set<string>> {
  if (!hasServiceRole || !voter) return new Set();
  const admin = createAdminClient();
  const { data } = await admin.from("upvotes").select("product_id").eq("voter", voter);
  return new Set(((data as { product_id: string }[]) ?? []).map((r) => r.product_id));
}

// ---- Reviews -----------------------------------------------------------------

export async function getReviews(productId: string): Promise<Review[]> {
  if (!isSupabaseConfigured) {
    return seedReviews.filter((r) => r.product_id === productId);
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("id, product_id, author_name, rating, body, created_at")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as unknown as Review[];
}

// ---- Licenses ----------------------------------------------------------------

const LICENSE_SELECT =
  "id, key, email, status, issued_at, order_id, product:products(id, name, slug, version, file_name)";

interface LicenseRow {
  id: string;
  key: string;
  email: string | null;
  status: "active" | "revoked";
  issued_at: string;
  order_id: string;
  product:
    | { id: string; name: string; slug: string; version: string; file_name: string | null }
    | { id: string; name: string; slug: string; version: string; file_name: string | null }[]
    | null;
}

function mapLicense(row: LicenseRow): License {
  const p = Array.isArray(row.product) ? row.product[0] : row.product;
  return {
    id: row.id,
    key: row.key,
    email: row.email ?? "",
    status: row.status,
    issued_at: row.issued_at,
    order_id: row.order_id,
    product: p
      ? { id: p.id, name: p.name, slug: p.slug, version: p.version, file_name: p.file_name }
      : { id: "", name: "Unknown", slug: "", version: "1.0.0", file_name: null },
  };
}

/** Build a deterministic license from a seed order (mock mode, no persistence). */
function mockLicenseFromOrder(order: Order, email = ""): License {
  const product = seedProducts.find((p) => p.slug === order.product.slug);
  return {
    id: `lic_${order.id}`,
    key: deterministicLicenseKey(order.id),
    email,
    status: "active",
    issued_at: order.created_at || new Date().toISOString(),
    order_id: order.id,
    product: {
      id: order.product.id,
      name: order.product.name,
      slug: order.product.slug,
      version: product?.version ?? "1.0.0",
      file_name: product?.file_name ?? null,
    },
  };
}

// License persistence runs through the trusted service-role client (there is no
// buyer auth). Without a service-role key, the buyer flow uses deterministic
// mock licenses so it stays demoable.

export async function getLicenseByOrder(orderId: string): Promise<License | null> {
  if (!hasServiceRole) {
    const order = await getOrderById(orderId);
    return order ? mockLicenseFromOrder(order) : null;
  }
  const admin = createAdminClient();
  const { data } = await admin
    .from("licenses")
    .select(LICENSE_SELECT)
    .eq("order_id", orderId)
    .maybeSingle();
  return data ? mapLicense(data as unknown as LicenseRow) : null;
}

export async function getLicenseByKey(key: string): Promise<License | null> {
  if (!hasServiceRole) return null; // can't reverse a deterministic key in mock mode
  const admin = createAdminClient();
  const { data } = await admin
    .from("licenses")
    .select(LICENSE_SELECT)
    .eq("key", key)
    .maybeSingle();
  return data ? mapLicense(data as unknown as LicenseRow) : null;
}

export async function getLicensesByEmail(email: string): Promise<License[]> {
  if (!hasServiceRole) {
    // Demo: surface every paid seed order as a license for the entered email.
    return seedOrders
      .filter((o) => o.status === "paid")
      .map((o) => mockLicenseFromOrder(o, email));
  }
  const admin = createAdminClient();
  const { data } = await admin
    .from("licenses")
    .select(LICENSE_SELECT)
    .eq("email", email)
    .eq("status", "active")
    .order("issued_at", { ascending: false });
  return ((data as unknown as LicenseRow[]) ?? []).map(mapLicense);
}

/**
 * Mark a (physical/service) order paid and credit any referring affiliate.
 * Used for orders that don't get a license. Idempotent on the affiliate credit.
 */
export async function markOrderPaid(orderId: string, reference?: string): Promise<boolean> {
  if (!hasServiceRole) return true;
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("amount_minor, affiliate_id, buyer_email, gift_card_code, gift_card_minor")
    .eq("id", orderId)
    .maybeSingle();
  await admin
    .from("orders")
    .update({ status: "paid", ...(reference ? { reference } : {}) })
    .eq("id", orderId);
  const o = order as {
    amount_minor: number;
    affiliate_id: string | null;
    buyer_email: string | null;
    gift_card_code: string | null;
    gift_card_minor: number | null;
  } | null;
  if (o?.gift_card_code && (o.gift_card_minor ?? 0) > 0) {
    await redeemGiftCard(o.gift_card_code, o.gift_card_minor ?? 0, orderId);
  }
  if (o?.affiliate_id && !(await affiliateOwnsEmail(o.affiliate_id, o.buyer_email))) {
    const { affiliate_percent } = await getSettings();
    const commission = Math.round((o.amount_minor * affiliate_percent) / 100);
    await admin
      .from("referrals")
      .insert({ affiliate_id: o.affiliate_id, order_id: orderId, amount_minor: commission })
      .then(() => undefined, () => undefined);
  }
  return true;
}

export interface BuyerOrder {
  id: string;
  product_name: string;
  product_slug: string;
  amount_minor: number;
  currency: "NGN" | "USD";
  status: string;
  fulfilment_status: string | null;
  created_at: string;
  license_key: string | null;
}

/** A buyer's full order history (digital + physical) by email. Service-role. */
export async function getOrdersByEmail(email: string): Promise<BuyerOrder[]> {
  if (!hasServiceRole || !email) return [];
  const { data } = await createAdminClient()
    .from("orders")
    .select(
      "id, amount_minor, currency, status, fulfilment_status, created_at, product:products(name, slug), license:licenses(key)"
    )
    .eq("buyer_email", email)
    .order("created_at", { ascending: false })
    .limit(100);

  type Row = {
    id: string;
    amount_minor: number;
    currency: "NGN" | "USD";
    status: string;
    fulfilment_status: string | null;
    created_at: string;
    product: { name: string; slug: string } | { name: string; slug: string }[] | null;
    license: { key: string }[] | { key: string } | null;
  };
  return ((data as Row[]) ?? []).map((r) => {
    const p = Array.isArray(r.product) ? r.product[0] : r.product;
    const l = Array.isArray(r.license) ? r.license[0] : r.license;
    return {
      id: r.id,
      product_name: p?.name ?? "Order",
      product_slug: p?.slug ?? "",
      amount_minor: r.amount_minor,
      currency: r.currency,
      status: r.status,
      fulfilment_status: r.fulfilment_status,
      created_at: r.created_at,
      license_key: l?.key ?? null,
    };
  });
}

/** Has this email got an active license for the product? (verified-purchase) */
export async function hasPurchased(productId: string, email: string): Promise<boolean> {
  if (!hasServiceRole) return true; // demo mode: allow reviewing
  if (!email) return false;
  const admin = createAdminClient();
  const { count } = await admin
    .from("licenses")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId)
    .eq("email", email)
    .eq("status", "active");
  return (count ?? 0) > 0;
}

/**
 * Send the branded receipt (+ license & download for digital) to the buyer for
 * an order. Always sends — use it to (re)send a receipt independently of the
 * one-time issuance. Returns false if there's no license/email to send to.
 */
export async function sendReceiptForOrder(orderId: string): Promise<boolean> {
  if (!hasServiceRole) return false;
  const license = await getLicenseByOrder(orderId);
  if (!license?.email) return false;

  const admin = createAdminClient();
  const { data } = await admin
    .from("orders")
    .select("amount_minor, currency, product:products(name, product_type)")
    .eq("id", orderId)
    .maybeSingle();
  const o = data as
    | { amount_minor: number; currency: "NGN" | "USD"; product: { name: string; product_type?: string } | { name: string; product_type?: string }[] | null }
    | null;
  const op = o ? (Array.isArray(o.product) ? o.product[0] : o.product) : null;
  const productName = op?.name ?? license.product.name;
  const isDigital = (op?.product_type ?? "digital") === "digital";
  const amountStr = formatPrice(o?.amount_minor ?? 0, o?.currency ?? "NGN");
  const ref = orderId.slice(0, 8).toUpperCase();
  const dl = `${SITE_URL}/api/download?order=${encodeURIComponent(orderId)}&key=${encodeURIComponent(license.key)}`;

  const receiptLine = `<table role="presentation" width="100%" style="margin:0 0 16px;border-collapse:collapse;">
    <tr><td style="font-size:12px;color:#737373;padding:4px 0;">Item</td><td style="font-size:12px;color:#171717;padding:4px 0;text-align:right;">${esc(productName)}</td></tr>
    <tr><td style="font-size:12px;color:#737373;padding:4px 0;">Amount paid</td><td style="font-size:12px;color:#171717;padding:4px 0;text-align:right;font-weight:600;">${amountStr}</td></tr>
    <tr><td style="font-size:12px;color:#737373;padding:4px 0;">Order</td><td style="font-size:12px;color:#171717;padding:4px 0;text-align:right;">#${ref}</td></tr>
  </table>`;
  const digitalBlock = `<p style="font-size:12px;color:#737373;margin:0 0 8px;">Your license key</p>
       ${emailKeyBox(license.key)}
       <div style="margin:22px 0;">${emailButton(dl, "⬇  Download now")}</div>
       ${emailText(`Find your purchases any time on your <a href="${SITE_URL}/downloads" style="color:#047857;">downloads page</a>.`)}`;
  const physicalBlock = emailText(
    "Your payment is confirmed. The seller has your details and will fulfil your order — they may contact you with delivery updates."
  );

  await sendEmail({
    to: license.email,
    subject: subjectSafe(`Receipt — ${productName} (#${ref})`),
    html: emailLayout(
      "Thank you for your purchase 🎉",
      `${emailText("Here's your receipt. Keep this email as proof of purchase.")}${receiptLine}${isDigital ? digitalBlock : physicalBlock}`
    ),
  });
  return true;
}

/**
 * Issue (or return the existing) license for an order. Idempotent.
 * Called by the Paystack webhook in production and by the success page in the
 * mock flow so the key shown is real and stored when Supabase is connected.
 */
export async function issueLicenseForOrder(
  orderId: string,
  email: string,
  reference?: string
): Promise<License | null> {
  if (!hasServiceRole) {
    const order = await getOrderById(orderId);
    return order ? mockLicenseFromOrder(order, email) : null;
  }

  const admin = createAdminClient();

  // Already issued? Return it.
  const existing = await getLicenseByOrder(orderId);
  if (existing) return existing;

  // Look up the order, then mark it paid and mint the key.
  const { data: order } = await admin
    .from("orders")
    .select("id, product_id, vendor_id, amount_minor, currency, affiliate_id, coupon_code, gift_card_code, gift_card_minor, buyer_email, product:products(name, product_type)")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return null;

  await admin
    .from("orders")
    .update({ status: "paid", ...(reference ? { reference } : {}) })
    .eq("id", orderId);

  // Count the coupon use once (this path only runs on first issue — idempotent).
  const couponCode = (order as { coupon_code?: string | null }).coupon_code;
  if (couponCode) await incrementCouponUse(couponCode);

  // Debit the gift card for its share (atomic + idempotent per order).
  const gcCode = (order as { gift_card_code?: string | null }).gift_card_code;
  const gcMinor = (order as { gift_card_minor?: number }).gift_card_minor ?? 0;
  if (gcCode && gcMinor > 0) await redeemGiftCard(gcCode, gcMinor, orderId);

  const o = order as {
    product_id: string;
    vendor_id: string;
    amount_minor: number;
    currency: "NGN" | "USD";
    affiliate_id: string | null;
    buyer_email: string | null;
    product: { name: string; product_type?: string } | { name: string; product_type?: string }[] | null;
  };
  const op = Array.isArray(o.product) ? o.product[0] : o.product;
  const productName = op?.name ?? "your order";
  const safeName = esc(productName);
  const isDigital = (op?.product_type ?? "digital") === "digital";
  const amountStr = formatPrice(o.amount_minor, o.currency);
  const ref = orderId.slice(0, 8).toUpperCase();

  // Credit the referring affiliate (idempotent via unique index on order_id).
  // Skip self-referral — you can't earn commission on your own purchase.
  let commission = 0;
  if (o.affiliate_id && !(await affiliateOwnsEmail(o.affiliate_id, o.buyer_email, email))) {
    const { affiliate_percent } = await getSettings();
    commission = Math.round((o.amount_minor * affiliate_percent) / 100);
    await admin
      .from("referrals")
      .insert({ affiliate_id: o.affiliate_id, order_id: orderId, amount_minor: commission })
      .then(() => undefined, () => undefined);
  }

  const { data: inserted } = await admin
    .from("licenses")
    .insert({
      order_id: orderId,
      product_id: o.product_id,
      key: generateLicenseKey(),
      email,
      status: "active",
    })
    .select(LICENSE_SELECT)
    .single();

  if (!inserted) return null;
  const license = mapLicense(inserted as unknown as LicenseRow);

  // 1) Buyer — branded receipt (+ licence & download for digital).
  await sendReceiptForOrder(orderId);

  // 2) Vendor — new-sale alert.
  const vendorEmail = await getVendorOwnerEmail(o.vendor_id);
  if (vendorEmail) {
    await sendEmail({
      to: vendorEmail,
      subject: subjectSafe(`💰 You made a sale — ${productName}`),
      html: emailLayout(
        "You made a sale! 💰",
        `${emailText(`<strong style="color:#171717">${safeName}</strong> just sold for <strong style="color:#171717">${amountStr}</strong> (order #${ref}). Your share settles to your bank automatically.`)}
         <div style="margin:18px 0;">${emailButton(`${SITE_URL}/vendor/dashboard`, "View dashboard")}</div>`
      ),
    });
  }

  // 3) Affiliate — earnings alert.
  if (o.affiliate_id && commission > 0) {
    const { data: aff } = await admin
      .from("affiliates")
      .select("email")
      .eq("id", o.affiliate_id)
      .maybeSingle();
    const affEmail = (aff as { email?: string } | null)?.email;
    if (affEmail) {
      await sendEmail({
        to: affEmail,
        subject: `🎉 You earned ${formatPrice(commission, o.currency)} on DoyinMart`,
        html: emailLayout(
          "You earned a commission! 🎉",
          `${emailText(`Someone bought <strong style="color:#171717">${safeName}</strong> through your referral link. You earned <strong style="color:#171717">${formatPrice(commission, o.currency)}</strong>.`)}
           <div style="margin:18px 0;">${emailButton(`${SITE_URL}/affiliate`, "View earnings")}</div>`
        ),
      });
    }
  }

  return license;
}
