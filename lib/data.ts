// Data access layer. Every page imports from here.
//
// If Supabase is configured (env set), these run real queries.
// Otherwise they return the built-in seed data so the UI is fully navigable
// with zero backend setup. Swapping in Supabase requires no page changes.

import { createClient } from "./supabase/server";
import { createAdminClient } from "./supabase/admin";
import { hasServiceRole, isSupabaseConfigured } from "./supabase/env";
import { deterministicLicenseKey, generateLicenseKey } from "./license";
import { emailLayout, sendEmail } from "./email";

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
    vendor: v
      ? mapVendor(v)
      : { id: "", slug: "", name: "Unknown vendor", initials: "?", verified: false },
  };
}

const PRODUCT_SELECT =
  "id, slug, name, price_minor, currency, platform, category, tagline, description, system_requirements, os_badges, version, file_path, file_name, file_size, download_count, rating_avg, rating_count, icon_url, screenshots, status, featured, rejection_reason, vendor:vendors(id, slug, name, initials, verified, suspended)";

// ---- Public queries ----------------------------------------------------------

export async function getProducts(
  platform?: Platform,
  search?: string
): Promise<Product[]> {
  const q = search?.trim().toLowerCase();

  if (!isSupabaseConfigured) {
    let list = (platform ? seedProducts.filter((p) => p.platform === platform) : seedProducts)
      .filter((p) => p.status === "approved");
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
  if (q) {
    const like = `%${q}%`;
    query = query.or(`name.ilike.${like},tagline.ilike.${like},category.ilike.${like}`);
  }
  const { data, error } = await query;
  // Connected to Supabase → return the real data only (no demo fallback).
  if (error) {
    console.error("getProducts:", error.message);
    return [];
  }
  return ((data as unknown as ProductRow[]) ?? [])
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
  if (error) {
    console.error("getProductBySlug:", error.message);
    return null;
  }
  if (!data) return null;
  const product = mapProduct(data as unknown as ProductRow);
  return product.vendor.suspended ? null : product;
}

export async function getRecentOrders(vendorId = DEMO_VENDOR_ID): Promise<Order[]> {
  if (!isSupabaseConfigured) {
    return seedOrders;
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, buyer_name, buyer_initials, amount_minor, currency, status, gateway, created_at, product:products(id, name, slug, price_minor, currency)"
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
      "id, buyer_name, buyer_initials, amount_minor, currency, status, gateway, created_at, product:products(id, name, slug, price_minor, currency)"
    )
    .eq("id", orderId)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as Order;
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

// ---- Admin queries (service role) --------------------------------------------

export async function adminProducts(status?: ProductStatus): Promise<Product[]> {
  if (!hasServiceRole) {
    return status ? seedProducts.filter((p) => p.status === status) : seedProducts;
  }
  const admin = createAdminClient();
  let q = admin.from("products").select(PRODUCT_SELECT).order("created_at", { ascending: false });
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error || !data) return [];
  return (data as unknown as ProductRow[]).map(mapProduct);
}

export async function adminVendors(): Promise<Vendor[]> {
  if (!hasServiceRole) return seedVendors;
  const admin = createAdminClient();
  const { data } = await admin
    .from("vendors")
    .select("id, slug, name, initials, verified, suspended")
    .order("created_at", { ascending: false });
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

export async function adminReviews(limit = 100): Promise<AdminReview[]> {
  if (!hasServiceRole) {
    return seedReviews.map((r) => ({
      ...r,
      product_name: seedProducts.find((p) => p.id === r.product_id)?.name ?? "—",
    }));
  }
  const admin = createAdminClient();
  const { data } = await admin
    .from("reviews")
    .select("id, product_id, author_name, rating, body, created_at, product:products(name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (
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
}

export async function adminOrders(status?: OrderStatus): Promise<Order[]> {
  if (!hasServiceRole) return status ? seedOrders.filter((o) => o.status === status) : seedOrders;
  const admin = createAdminClient();
  let q = admin
    .from("orders")
    .select(
      "id, buyer_name, buyer_initials, amount_minor, currency, status, gateway, created_at, product:products(id, name, slug, price_minor, currency)"
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (status) q = q.eq("status", status);
  const { data } = await q;
  return (data as unknown as Order[]) ?? [];
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

export async function getVendorOrders(
  vendorId = DEMO_VENDOR_ID,
  status?: OrderStatus
): Promise<Order[]> {
  if (!isSupabaseConfigured) {
    return status ? seedOrders.filter((o) => o.status === status) : seedOrders;
  }
  const supabase = await createClient();
  let query = supabase
    .from("orders")
    .select(
      "id, buyer_name, buyer_initials, amount_minor, currency, status, gateway, created_at, product:products(id, name, slug, price_minor, currency)"
    )
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error || !data) return [];
  return data as unknown as Order[];
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

  // Look up the order to get the product, then mark it paid and mint the key.
  const { data: order } = await admin
    .from("orders")
    .select("id, product_id")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return null;

  await admin
    .from("orders")
    .update({ status: "paid", ...(reference ? { reference } : {}) })
    .eq("id", orderId);

  const { data: inserted } = await admin
    .from("licenses")
    .insert({
      order_id: orderId,
      product_id: (order as { product_id: string }).product_id,
      key: generateLicenseKey(),
      email,
      status: "active",
    })
    .select(LICENSE_SELECT)
    .single();

  if (!inserted) return null;
  const license = mapLicense(inserted as unknown as LicenseRow);

  // Email the buyer their key + download link (no-op if email isn't configured).
  if (license.email) {
    const dl = `${SITE_URL}/api/download?order=${encodeURIComponent(orderId)}&key=${encodeURIComponent(license.key)}`;
    await sendEmail({
      to: license.email,
      subject: `Your ${license.product.name} license`,
      html: emailLayout(
        "Thanks for your purchase 🎉",
        `<p>Here is your license for <strong>${license.product.name}</strong>:</p>
         <p style="font-size:15px;font-weight:600;letter-spacing:.5px">${license.key}</p>
         <p><a href="${dl}" style="background:#047857;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;display:inline-block">Download software</a></p>
         <p style="font-size:12px;color:#737373">Or find it any time on your downloads page.</p>`
      ),
    });
  }

  return license;
}
