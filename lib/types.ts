// Domain types for the DoyinMart marketplace.
// These mirror the Supabase schema in supabase/migrations/0001_init.sql.

export type Platform = "desktop" | "mobile" | "web" | "free";
export type ProductType = "digital" | "physical" | "service";
export type Currency = "NGN" | "USD";
export type OrderStatus = "paid" | "pending" | "refunded";
export type Gateway = "paystack" | "flutterwave" | "stripe";

export interface Vendor {
  id: string;
  slug: string;
  name: string;
  initials: string;
  verified: boolean;
  /** Banned vendors: their products are hidden and they can't publish. */
  suspended?: boolean;
  /** WhatsApp number (digits, intl) for buyer contact. */
  whatsapp?: string | null;
  /** Store bio + cover image (store page branding). */
  bio?: string | null;
  cover_url?: string | null;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  vendor: Vendor;
  /** Price in minor units (kobo / cents). 0 means free. */
  price_minor: number;
  currency: Currency;
  platform: Platform;
  category: string;
  tagline: string;
  description: string;
  system_requirements: string;
  /** OS/platform badges shown on the product page, e.g. ["Windows", "macOS"]. */
  os_badges: string[];
  /** Released version, e.g. "2.1.0". */
  version: string;
  /** Storage path of the uploaded binary (private bucket). Null until uploaded. */
  file_path: string | null;
  /** Original upload filename, shown to buyers, e.g. "VectorForge-2.1.0.exe". */
  file_name: string | null;
  /** File size in bytes, for display. */
  file_size: number | null;
  download_count: number;
  /** Average rating 0–5 (1 decimal) and number of reviews. */
  rating_avg: number;
  rating_count: number;
  /** App icon URL (public). Null until uploaded. */
  icon_url: string | null;
  /** Screenshot URLs (public). */
  screenshots: string[];
  /** Moderation status — only 'approved' products appear on the storefront. */
  status: ProductStatus;
  /** Featured products lead the homepage hero. */
  featured: boolean;
  rejection_reason: string | null;
  /** When the product launched (for the Launches board). */
  launched_at?: string | null;
  /** Upvotes on the Launches board. */
  upvotes: number;
  /** digital = download/license; physical = shipped; service = booking/contact. */
  product_type: ProductType;
}

export type ProductStatus = "pending" | "approved" | "rejected";

export interface Review {
  id: string;
  product_id: string;
  author_name: string;
  rating: number;
  body: string;
  created_at: string;
}

export type LicenseStatus = "active" | "revoked";

export interface License {
  id: string;
  key: string;
  email: string;
  status: LicenseStatus;
  issued_at: string;
  order_id: string;
  product: {
    id: string;
    name: string;
    slug: string;
    version: string;
    file_name: string | null;
  };
}

export interface Order {
  id: string;
  product: Pick<Product, "id" | "name" | "slug" | "price_minor" | "currency"> & {
    product_type?: ProductType;
  };
  buyer_name: string;
  buyer_initials: string;
  amount_minor: number;
  currency: Currency;
  status: OrderStatus;
  gateway: Gateway;
  created_at: string;
  /** Set for physical/service orders: 'pending' | 'shipped' | 'delivered'. */
  fulfilment_status?: string | null;
  shipping_name?: string | null;
  shipping_phone?: string | null;
  shipping_address?: string | null;
  buyer_email?: string | null;
  /** Payment processor reference (Paystack). */
  reference?: string | null;
  /** Portion of the order paid by a gift card (rest goes to the gateway). */
  gift_card_minor?: number | null;
}

export interface DashboardMetrics {
  revenue_minor: number;
  units_sold: number;
  pending_payout_minor: number;
  currency: Currency;
}

export type PayoutStatus = "requested" | "paid" | "failed";

export interface Payout {
  id: string;
  amount_minor: number;
  currency: Currency;
  status: PayoutStatus;
  method: string;
  reference: string | null;
  created_at: string;
  paid_at: string | null;
}

export interface PayoutSummary {
  available_minor: number;
  pending_minor: number;
  paid_out_minor: number;
  currency: Currency;
}

export interface PayoutDetails {
  bank: string;
  account_name: string;
  account_number: string;
}
