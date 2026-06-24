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

## Notes / next steps
- This is the **store app**. The dedicated **DmartCard** gift-card app reuses the
  same `api.dart` + `theme.dart` (see `docs/dmartcard-app-plan.md`).
- Planned: push notifications (FCM), Riverpod for state, offline caching, QR scan
  to redeem (mobile_scanner), and a native checkout via the Paystack mobile SDK.
- The native shell never holds the service role; privileged actions go through the
  JWT-authenticated API or the WebView flow.
