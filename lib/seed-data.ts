// Built-in seed data. Mirrors supabase/seed.sql so the UI renders the exact
// wireframe content even before a Supabase project is connected.
// The data layer (lib/data.ts) falls back to this when Supabase env is unset.

import type {
  DashboardMetrics,
  Order,
  Payout,
  PayoutDetails,
  PayoutSummary,
  Product,
  Review,
  Vendor,
} from "./types";

export const vendors: Vendor[] = [
  { id: "v_adeyemi", slug: "studio-adeyemi", name: "Studio Adeyemi", initials: "SA", verified: true },
  { id: "v_doyintech", slug: "doyintech", name: "DoyinTech", initials: "DT", verified: true },
  { id: "v_okoro", slug: "okoro-labs", name: "Okoro Labs", initials: "OL", verified: false },
];

const byId = (id: string) => vendors.find((v) => v.id === id)!;

export const products: Product[] = [
  {
    id: "p_vectorforge",
    slug: "vectorforge",
    name: "VectorForge",
    vendor: byId("v_adeyemi"),
    price_minor: 1500000,
    currency: "NGN",
    platform: "desktop",
    category: "Design tools",
    tagline: "Vector illustration, offline-first",
    description:
      "A vector illustration tool built for low-bandwidth workflows, with offline export and Yoruba-language UI.",
    system_requirements: "Windows 10+, 4GB RAM, 500MB disk",
    os_badges: ["Windows", "macOS"],
    version: "2.1.0",
    file_path: null,
    file_name: "VectorForge-Setup-2.1.0.exe",
    file_size: 84934656,
    download_count: 312,
    rating_avg: 4.6,
    rating_count: 38,
    upvotes: 38,
    icon_url: null,
    screenshots: [],
    status: "approved" as const,
    featured: true,
    rejection_reason: null,
  },
  {
    id: "p_pulsedesk",
    slug: "pulsedesk",
    name: "PulseDesk",
    vendor: byId("v_doyintech"),
    price_minor: 2900,
    currency: "USD",
    platform: "web",
    category: "Support",
    tagline: "Lightweight helpdesk for small teams",
    description:
      "A lightweight helpdesk and shared inbox for small teams, with SLA tracking and offline draft sync.",
    system_requirements: "Any modern browser, no install required",
    os_badges: ["Web app"],
    version: "3.4.1",
    file_path: null,
    file_name: "pulsedesk-selfhost-3.4.1.zip",
    file_size: 12582912,
    download_count: 87,
    rating_avg: 4.2,
    rating_count: 11,
    upvotes: 11,
    icon_url: null,
    screenshots: [],
    status: "approved" as const,
    featured: false,
    rejection_reason: null,
  },
  {
    id: "p_fieldtrack",
    slug: "fieldtrack",
    name: "FieldTrack",
    vendor: byId("v_okoro"),
    price_minor: 0,
    currency: "NGN",
    platform: "mobile",
    category: "Logistics",
    tagline: "Offline field data collection",
    description:
      "Collect field survey data offline on Android and sync when you regain signal. Built for rural deployments.",
    system_requirements: "Android 8.0+, 100MB storage",
    os_badges: ["Android"],
    version: "1.6.2",
    file_path: null,
    file_name: "fieldtrack-1.6.2.apk",
    file_size: 41943040,
    download_count: 1204,
    rating_avg: 4.8,
    rating_count: 92,
    upvotes: 92,
    icon_url: null,
    screenshots: [],
    status: "approved" as const,
    featured: true,
    rejection_reason: null,
  },
  {
    id: "p_kobokeep",
    slug: "kobokeep",
    name: "KoboKeep",
    vendor: byId("v_doyintech"),
    price_minor: 800000,
    currency: "NGN",
    platform: "web",
    category: "Finance",
    tagline: "Bookkeeping for informal traders",
    description:
      "Simple bookkeeping and daily cash reconciliation for market traders, with WhatsApp receipt capture.",
    system_requirements: "Any modern browser, works on 2G",
    os_badges: ["Web app"],
    version: "2.0.0",
    file_path: null,
    file_name: "kobokeep-2.0.0.zip",
    file_size: 9437184,
    download_count: 56,
    rating_avg: 4.0,
    rating_count: 7,
    upvotes: 7,
    icon_url: null,
    screenshots: [],
    status: "approved" as const,
    featured: false,
    rejection_reason: null,
  },
  {
    id: "p_naijafonts",
    slug: "naijafonts",
    name: "NaijaFonts",
    vendor: byId("v_adeyemi"),
    price_minor: 450000,
    currency: "NGN",
    platform: "desktop",
    category: "Design tools",
    tagline: "Type family pack for African scripts",
    description:
      "A type family pack covering Latin, Yoruba and Hausa diacritics, licensed for commercial desktop use.",
    system_requirements: "Windows or macOS, any version",
    os_badges: ["Windows", "macOS"],
    version: "1.3.0",
    file_path: null,
    file_name: "NaijaFonts-1.3.0.zip",
    file_size: 6291456,
    download_count: 143,
    rating_avg: 4.5,
    rating_count: 19,
    upvotes: 19,
    icon_url: null,
    screenshots: [],
    status: "approved" as const,
    featured: false,
    rejection_reason: null,
  },
  {
    id: "p_marketmesh",
    slug: "marketmesh",
    name: "MarketMesh",
    vendor: byId("v_okoro"),
    price_minor: 4900,
    currency: "USD",
    platform: "web",
    category: "Commerce",
    tagline: "Storefront builder with offline cart",
    description:
      "Build a hosted storefront with an offline cart that queues orders during outages and syncs on reconnect.",
    system_requirements: "Any modern browser",
    os_badges: ["Web app"],
    version: "0.9.4",
    file_path: null,
    file_name: "marketmesh-0.9.4.zip",
    file_size: 15728640,
    download_count: 22,
    rating_avg: 3.8,
    rating_count: 4,
    upvotes: 4,
    icon_url: null,
    screenshots: [],
    status: "approved" as const,
    featured: false,
    rejection_reason: null,
  },
];

const productRef = (slug: string) => {
  const p = products.find((x) => x.slug === slug)!;
  return { id: p.id, name: p.name, slug: p.slug, price_minor: p.price_minor, currency: p.currency };
};

// Orders for the seed vendor (Studio Adeyemi) shown on the dashboard.
export const orders: Order[] = [
  {
    id: "o_1001",
    product: productRef("vectorforge"),
    buyer_name: "M. Bello",
    buyer_initials: "MB",
    amount_minor: 1500000,
    currency: "NGN",
    status: "paid",
    gateway: "paystack",
    created_at: "2026-06-16T10:24:00Z",
  },
  {
    id: "o_1002",
    product: productRef("vectorforge"),
    buyer_name: "T. Okafor",
    buyer_initials: "TO",
    amount_minor: 1500000,
    currency: "NGN",
    status: "paid",
    gateway: "paystack",
    created_at: "2026-06-15T16:02:00Z",
  },
  {
    id: "o_1003",
    product: productRef("naijafonts"),
    buyer_name: "A. Eze",
    buyer_initials: "AE",
    amount_minor: 450000,
    currency: "NGN",
    status: "paid",
    gateway: "flutterwave",
    created_at: "2026-06-14T09:11:00Z",
  },
  {
    id: "o_1004",
    product: productRef("vectorforge"),
    buyer_name: "F. Lawal",
    buyer_initials: "FL",
    amount_minor: 1500000,
    currency: "NGN",
    status: "pending",
    gateway: "paystack",
    created_at: "2026-06-18T08:40:00Z",
  },
];

export const dashboardMetrics: DashboardMetrics = {
  revenue_minor: 34000000,
  units_sold: 27,
  pending_payout_minor: 27200000,
  currency: "NGN",
};

export const payoutSummary: PayoutSummary = {
  available_minor: 6800000, // ₦68,000 cleared and withdrawable
  pending_minor: 27200000, // ₦272,000 still settling
  paid_out_minor: 13600000, // ₦136,000 already withdrawn
  currency: "NGN",
};

export const payouts: Payout[] = [
  {
    id: "po_2001",
    amount_minor: 6800000,
    currency: "NGN",
    status: "paid",
    method: "Bank transfer",
    reference: "PSTK_PO_8842",
    created_at: "2026-06-01T09:00:00Z",
    paid_at: "2026-06-02T11:30:00Z",
  },
  {
    id: "po_2002",
    amount_minor: 6800000,
    currency: "NGN",
    status: "paid",
    method: "Bank transfer",
    reference: "PSTK_PO_8113",
    created_at: "2026-05-01T09:00:00Z",
    paid_at: "2026-05-02T10:15:00Z",
  },
];

export const payoutDetails: PayoutDetails = {
  bank: "GTBank",
  account_name: "Studio Adeyemi Ltd",
  account_number: "0123456789",
};

// Sample reviews shown on product detail pages (keyed by product slug in mock mode).
export const reviews: Review[] = [
  {
    id: "rv_1",
    product_id: "p_vectorforge",
    author_name: "Chidi N.",
    rating: 5,
    body: "Offline export is a lifesaver on bad connections. The Yoruba UI is a lovely touch.",
    created_at: "2026-06-10T12:00:00Z",
  },
  {
    id: "rv_2",
    product_id: "p_vectorforge",
    author_name: "Aisha B.",
    rating: 4,
    body: "Fast and lightweight. Would love more brush presets, but solid for the price.",
    created_at: "2026-06-08T09:30:00Z",
  },
  {
    id: "rv_3",
    product_id: "p_fieldtrack",
    author_name: "Tunde O.",
    rating: 5,
    body: "We rolled this out to 40 field agents in rural areas. Sync just works.",
    created_at: "2026-06-05T15:45:00Z",
  },
];
