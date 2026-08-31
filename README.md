# DoyinSoft

A software marketplace for African markets — desktop, mobile and web apps from
independent developers. Buy licenses, pay with Paystack (Flutterwave / Stripe
stubbed), and manage sales from a vendor dashboard.

Built to the approved wireframe in [`doyinsoft_wireframes.html`](./doyinsoft_wireframes.html)
and the design spec in [`doyinsoft-design-system.md`](./doyinsoft-design-system.md):
flat, neutral, hairline borders, two font weights, one black/white accent button.

## Stack

- **Next.js 15** (App Router, Server Components) + **TypeScript**
- **Tailwind CSS v4** with the design tokens as CSS variables
- **Supabase** (Postgres + Auth + RLS) for data
- **lucide-react** for icons
- **Paystack** for payments

## Quick start

```bash
npm install
cp .env.local.example .env.local   # optional — runs on seed data if blank
npm run dev
```

Open http://localhost:3000. With no env set, the app uses built-in seed data
(`lib/seed-data.ts`) so every page is navigable immediately.

## Pages

| Route | Page |
|---|---|
| `/` | Homepage / storefront — search, hero, filter pills, product grid |
| `/products/[slug]` | Product detail — screenshot, description, price card, vendor card |
| `/sign-up` | Vendor registration (creates auth user + vendor profile) |
| `/sign-in` | Vendor login |
| `/vendor/dashboard` | Vendor dashboard — scoped to the signed-in vendor |
| `/vendor/products` | Vendor's products list (version, downloads, file size, edit) |
| `/vendor/products/new` | Add product — metadata + software file upload |
| `/vendor/products/[id]/edit` | Edit product / publish new version / delete |
| `/vendor/orders` | All orders with paid/pending/refunded filter |
| `/vendor/payouts` | Balance, payout history, withdrawal account, request payout |
| `/vendor/settings` | Edit vendor profile + verification status |
| `/checkout/[orderId]` | Checkout — order summary, payment method, pay |
| `/checkout/[orderId]/success` | Confirmation + license key + gated download |
| `/downloads` | Buyer re-download page (lookup by email) |

`Buy license` routes to `/checkout/new?product=<slug>`, which synthesizes a
pending order from the product.

## Upload → license → download flow

```
VENDOR                         PURCHASE                       BUYER
/vendor/products/new           Paystack confirms (webhook)    /downloads or success page
  → uploads installer            → POST /api/webhooks/paystack  → GET /api/download
  → private "software" bucket    → order marked paid            → server checks license active
  → product row gets file_path   → license key minted + stored  → mints SHORT-LIVED signed URL
                                                                 → redirect → download starts
```

- **Files are private.** Buyers never get a public link — only a signed URL that
  expires (10 min), minted server-side *after* the license is verified.
- **License keys are real rows** (`licenses` table), issued on payment, and
  checkable at `POST /api/licenses/verify` for in-app activation.
- **The webhook is the source of truth** for "paid" — not the browser.

### Internal routes used by this flow (not a public API)

These are internal application routes, not a public/customer-facing API:

| Endpoint | Purpose |
|---|---|
| `GET /api/download?order=&key=` | Gated download → signed URL or certificate |
| `POST /api/licenses/verify` `{ key }` | Validate a license key (app activation) |
| `POST /api/webhooks/paystack` | Payment confirmation → mint license |

### What needs a real Supabase project to fully work

Uploading and downloading actual binaries needs Supabase Storage + the
service-role key. Without it, the app still demos end-to-end: browse → buy →
get a real-format license key → download a **license certificate** file. Add the
three Supabase env vars (incl. `SUPABASE_SERVICE_ROLE_KEY`) to switch on real
file storage and persisted licenses.

## Authentication & per-vendor dashboards

Vendors register at `/sign-up` (Supabase Auth email + password). Sign-up creates
the auth user **and** a `vendors` row owned by that user (`vendors.owner = auth.uid()`).
From then on every vendor query is scoped to the signed-in vendor:

- `lib/auth.ts` — `getCurrentVendor()` resolves the vendor from the session;
  `requireVendor()` redirects guests to `/sign-in`.
- `middleware.ts` refreshes the auth cookie on every request.
- **RLS enforces it at the database**, not just the UI: a vendor can only read
  their own orders and manage their own products (`supabase/migrations/0003_vendor_auth.sql`).
- `/auth/callback` exchanges the email-confirmation code for a session.

In **demo mode** (no Supabase) the dashboard opens as the seed vendor so the UI
is explorable; sign-up/in explain that a Supabase project is needed for real
accounts.

> Tip: to skip email confirmation in dev, turn it off in Supabase →
> Authentication → Providers → Email.

## Discovery & social proof

- **Search** — the nav search box filters products by name, tagline, category
  (and vendor name in demo mode) via `?q=`. Combines with the platform pills.
- **Ratings & reviews** — star ratings show on product cards and detail pages;
  buyers post reviews from the product page. `products.rating_avg` / `rating_count`
  are kept in sync by a Postgres trigger on the `reviews` table
  (`supabase/migrations/0005_reviews.sql`).

## Connecting Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Run migrations [`0001`](./supabase/migrations/0001_init.sql)–[`0005`](./supabase/migrations/0005_reviews.sql)
   in order, then optionally [`seed.sql`](./supabase/seed.sql) in the SQL editor.
3. Put the project URL, anon key, and service-role key in `.env.local`.

The data layer (`lib/data.ts`) automatically switches from seed data to live
queries once those env vars are present — no page changes needed.

## Connecting Paystack

Add `PAYSTACK_SECRET_KEY` and `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` to `.env.local`.
The checkout server action initializes a real Paystack transaction and redirects
to the hosted page. Without keys, checkout falls back to a mock success page so
the flow stays demoable.

> Note: a small **email** field was added to the checkout form (not in the
> original wireframe) because the payment gateway requires it to send the
> receipt and license key.

---
<!-- pushpen-footer -->
Documentation automatically generated and kept up to date by [Pushpen](https://pushpen.dev).
