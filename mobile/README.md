# DoyinMart — Mobile App (Flutter)

The marketplace app: same emerald theme and features as the web (browse, search,
stores, product detail, gift cards, account with licenses + gift cards). It talks
to the existing backend — **reads** via the `/api/mobile/*` REST endpoints and
**auth** via Supabase; **checkout & gift-card purchase run in a WebView of the
hardened web flow**, so no payment/money logic is duplicated.

## Architecture
- `lib/api.dart` — REST client over `/api/mobile/*` (sends the Supabase token for `/me`).
- `lib/theme.dart` — emerald light/dark theme mirroring the web design tokens.
- `lib/screens/checkout_webview.dart` — opens `/checkout/...` and `/gift-cards` in a WebView; Paystack runs inside it and returns to the success page.
- Auth: `supabase_flutter` (email/password). The access token authorizes the API.

## Prerequisites
- Flutter SDK 3.3+ (`flutter --version`)
- The backend deployed (or running) with the `/api/mobile/*` routes.

## Setup & run
```bash
cd mobile
flutter pub get

flutter run \
  --dart-define=API_BASE=https://doyinsoft.vercel.app \
  --dart-define=SUPABASE_URL=https://YOUR-PROJECT.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=YOUR_ANON_KEY
```
`API_BASE` defaults to the deployed site, so it runs read-only without the defines;
add the Supabase ones to enable sign-in and the Account tab.

## Build
```bash
flutter build apk   --dart-define=API_BASE=... --dart-define=SUPABASE_URL=... --dart-define=SUPABASE_ANON_KEY=...
flutter build ipa   --dart-define=...
```

## Features (shared with the web)
- **Shop** — featured carousel, collapsible search, type filters, recently viewed, shimmer skeletons.
- **Stores** — searchable, paginated card grid (avatar, bio, followers, items) → store profile (follow).
- **Product** — image gallery (zoom), reviews, Buy (WebView), Follow, Review, **Save** (wishlist).
- **Gift cards** — buy (WebView) + balance check.
- **Account** — centered profile, Orders + Saved quick tiles, Facebook-style Following row,
  gift cards, minimized purchases, theme toggle (light/dark), affiliate/sell/legal links.
- **Orders** and **Wishlist** are shared with the web via `/api/mobile/orders` and `/wishlist`.

## Push notifications (needs your Firebase project — not yet wired)
The hooks exist server-side (orders paid, gift received, followed-store launches). To enable:
1. Create a Firebase project; add Android (`google-services.json`) + iOS apps via `flutterfire configure`.
2. Add `firebase_core` + `firebase_messaging`; request permission and read the FCM token on sign-in.
3. Add a `device_tokens` table (`user_id`, `token`) + a `POST /api/mobile/device-token` endpoint.
4. Server-side: on order paid / gift issued / product approved, look up the user's tokens and send
   via the FCM HTTP v1 API using a Firebase service-account key (server-only env var).

## Notes
- The dedicated **DmartCard** gift-card app reuses the same `api.dart` + `theme.dart`
  (see `docs/dmartcard-app-plan.md`).
- The native shell never holds the service role; privileged actions go through the
  JWT-authenticated API or the WebView flow.
- Regenerate icon/splash: `dart run flutter_launcher_icons && dart run flutter_native_splash:create`.
