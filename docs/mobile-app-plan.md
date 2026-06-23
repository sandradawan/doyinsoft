# DoyinMart Mobile (Flutter) — Implementation Plan

Status: **planned, not built.**

A Flutter app for the DoyinMart storefront (browse → buy → download/track →
account), backed by the **existing** Next.js + Supabase + Paystack stack. This doc
also defines the shared mobile architecture that **DmartCard** (see
`dmartcard-app-plan.md`) reuses.

---

## 1. Guiding principle — reuse the backend, don't fork it

The web app already holds the business logic (server-derived pricing, webhook
verification, commission split, licences, coupons, gift cards). The app must **not**
re-implement or bypass any of it, and must **never** ship the Supabase service-role
key. So:

- **Reads + auth** → Flutter talks to **Supabase directly** (`supabase_flutter`,
  anon key + the user's JWT) for data protected by RLS: products, stores, the user's
  own orders/licences/reviews, follows.
- **Privileged writes** (create order, init/verify payment, redeem coupon/gift card,
  issue licence) → Flutter calls a **mobile REST API** added to the Next.js app,
  which runs the same hardened server logic with the service role. The app sends
  `Authorization: Bearer <supabase access token>`; the route validates it.

This keeps one source of truth and inherits every pentest fix automatically.

---

## 2. Architecture

```
Flutter app
  ├─ supabase_flutter           → auth (email/OTP), RLS reads, storage, realtime
  ├─ REST client (dio)          → /api/mobile/* on the Next.js backend (JWT bearer)
  └─ Paystack via WebView       → open authorization_url, detect success, verify
Next.js backend (unchanged core)
  ├─ NEW /api/mobile/* handlers → wrap existing lib/ logic, auth via Supabase JWT
  ├─ existing webhook           → still the authoritative "paid" signal
  └─ service role               → server-only, never leaves the backend
Supabase: Postgres + Auth + Storage + RLS (shared by web & mobile)
```

### Payments (secure, reuses our flow)
1. App calls `POST /api/mobile/checkout` → backend **derives the price server-side**
   (the C1 rule), creates the pending order, returns Paystack `authorization_url`.
2. App opens it in `flutter_inappwebview`; on redirect to the success URL it closes
   the webview and calls `GET /api/mobile/orders/:id` (or verify) to confirm.
3. The **webhook** remains the real source of truth (amount re-verified) and issues
   the licence — same as web. No client controls money.

> Alternative: Paystack's mobile SDK for native card entry. The WebView approach is
> recommended first because it reuses the exact server flow we already hardened.

---

## 3. Mobile REST API to add (Next.js route handlers)

All under `/api/mobile/`, authenticated by validating the Supabase access token
(`supabase.auth.getUser(token)`), rate-limited via `checkRateLimit`:

| Endpoint | Purpose |
|---|---|
| `GET /products`, `GET /products/:slug` | catalogue (could also be direct Supabase) |
| `GET /stores`, `GET /stores/:slug` | storefronts |
| `POST /checkout` | create order, return Paystack URL (price server-derived) |
| `GET /orders`, `GET /orders/:id` | the user's orders/status |
| `GET /licenses` | the user's keys + signed download links |
| `POST /reviews` | verified-purchase review (one per buyer) |
| `POST /follow` | follow/unfollow a store |
| `POST /coupon/preview`, `POST /giftcard/preview` | discount/credit preview |

Add **CORS**/headers for the app, and a single `requireMobileUser(token)` helper.
(Optionally these could be Supabase Edge Functions instead — but keeping them in the
Next.js app means one codebase and the same `lib/` logic.)

---

## 4. App stack & packages

- **State:** Riverpod (`flutter_riverpod`) — testable, no BuildContext coupling.
- **Routing:** `go_router` (deep links for email confirm + gift links).
- **Backend:** `supabase_flutter` (auth/db/storage) + `dio` (REST).
- **Payments:** `flutter_inappwebview` (Paystack checkout).
- **Images:** `cached_network_image` (low-bandwidth friendly).
- **Push:** `firebase_messaging` (FCM) — order paid, sale alert, affiliate, gift received.
- **Storage:** Supabase persists the session; `flutter_secure_storage` for any extra secrets.
- **Misc:** `intl` (₦ formatting), `share_plus`, `url_launcher`.

### Project structure (monorepo via **melos** — shared with DmartCard)
```
dmart/                     # melos workspace
  packages/
    dmart_core/            # api client, Supabase init, models, auth, ₦ format
    dmart_ui/              # design system: emerald theme, buttons, cards (match web tokens)
  apps/
    dmart_store/           # this app
    dmart_card/            # DmartCard (gift cards) — see other doc
```
`dmart_core` + `dmart_ui` are shared, so DmartCard reuses auth, the API client, and
the brand design system. Build **flavors**: `dev` (staging URL) / `prod`.

---

## 5. Screens (store app)

Home (featured + categories + type filter) · Search · Product detail (gallery,
reviews, buy) · Checkout (email/shipping, coupon, **gift card**, Paystack) · Order
success + licence/download · Account (purchases, keys, downloads) · Store profile
(follow, products) · Following feed · Affiliate (link, earnings) · Auth (sign in/up,
OTP) · Settings (theme, notifications, logout).

---

## 6. Cross-cutting

- **Low-bandwidth (African-market thesis):** cache catalogue, compress/resize images,
  skeleton loaders, retry/offline banners, small initial payloads.
- **Theme:** mirror the web emerald tokens (light/dark) in `dmart_ui` for brand parity.
- **Security:** anon key only; validate JWT server-side on every privileged call;
  RLS already scopes user data; rate-limit mobile endpoints; optional cert pinning.
- **Push:** store FCM token per user (new `device_tokens` table); backend sends on
  order paid / new sale / affiliate earning / gift received.
- **Release:** Play Store + App Store; flavors + `--dart-define` for keys; CI
  (Codemagic/GitHub Actions) to build & sign; semantic versioning.

---

## 7. Phases

1. **Foundation:** melos workspace, `dmart_core` (Supabase init + auth + API client),
   `dmart_ui` theme. Add `requireMobileUser` + first `/api/mobile` endpoints.
2. **Browse:** home, search, product/store detail (Supabase reads).
3. **Buy:** checkout endpoint + Paystack WebView + success/licence; account/downloads.
4. **Engage:** reviews, follow, following feed, affiliate.
5. **Push** notifications + settings.
6. **Harden + ship:** offline/caching, store listings, CI, release.

**Open questions:** Riverpod vs Bloc? FCM vs OneSignal? WebView vs native Paystack
SDK? Ship store app and DmartCard separately or one app with a gift-card tab?
