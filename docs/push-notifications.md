# Push notifications — what's wired + how to test

**Everything is wired in code.** Both ends are done:

Server (dormant until `FCM_SERVICE_ACCOUNT` is set):
- `device_tokens` table (migration **0029**) stores each signed-in device's token.
- `POST /api/mobile/device-token` registers a token; `DELETE` unregisters it.
- `lib/push.ts` sends via **FCM HTTP v1** (no SDK dependency) and prunes dead tokens.
- `notify()` fires a push for **every** in-app event — order paid, gift received,
  a followed store's launch, etc. No extra server work.

Flutter (Android, in this repo):
- `firebase_core` + `firebase_messaging` in `pubspec.yaml`.
- `com.google.gms.google-services` Gradle plugin applied (settings + app gradle).
- `POST_NOTIFICATIONS` + `INTERNET` in `AndroidManifest.xml`.
- `lib/push_service.dart` (init, permission, token register/unregister, background
  handler) wired into `lib/main.dart` — registers on sign-in, unregisters on sign-out.

Android initialises from `mobile/android/app/google-services.json` natively, so no
`firebase_options.dart` is needed for the Android test.

---

## Already done (project `doyinmart-a86cd`)
- ✅ Firebase project created; `google-services.json` in `mobile/android/app/`
  (package `com.example.doyinmart` matches `applicationId`).
- ✅ `FCM_SERVICE_ACCOUNT` set in Vercel.

## Two things to finish before testing
1. **Apply migration 0029** on Supabase (or run `supabase/setup.sql`), then verify:
   ```bash
   npm run check:schema   # must print ✓ Schema matches
   ```
2. **Redeploy the web** so the server picks up `FCM_SERVICE_ACCOUNT` + the new
   `/api/mobile/device-token` route (push to `main`, or `vercel --prod`).

## Test it (Android phone)
```bash
cd mobile
flutter run --dart-define=API_BASE=https://doyinsoft.vercel.app \
  --dart-define=SUPABASE_URL=https://tljglirmrnsakgnsbhmg.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=<your anon key>
```
1. **Sign in** in the app. The logs should show
   `Push token registered: <prefix>…`. (That means the device token reached
   `/api/mobile/device-token`.)
2. **Quickest check** — Firebase console → **Messaging → Send test message** →
   paste the FCM token (printed in the logs, or grab it from the
   `device_tokens` table) → Send. The phone should buzz.
3. **End-to-end** — trigger a real event: buy a gift card to your own email, or
   follow a store and have it launch a product. `notify()` → push arrives.
   Put the app in the **background** for the most reliable banner (Android only
   shows a system notification when backgrounded).

## (Optional) open a screen when a notification is tapped
The server sends a `data.link` (e.g. `/gift-cards`). To route on tap, add in
`push_service.dart`:
```dart
FirebaseMessaging.onMessageOpenedApp.listen((m) {
  final link = m.data['link']; // e.g. "/gift-cards" — navigate accordingly
});
```

## iOS (when you ship it)
Add the iOS app in Firebase, put `GoogleService-Info.plist` in `ios/Runner/` via
Xcode, and upload an **APNs auth key** (.p8) in Firebase → Cloud Messaging. Push
won't work on the iOS simulator — use a real device.

## Troubleshooting
- **No push, server logs `[push] token exchange failed`** → `FCM_SERVICE_ACCOUNT`
  JSON is malformed or from the wrong project.
- **Android shows nothing in foreground** → that's expected; Android only shows a
  system notification in the background. Use a local-notification plugin if you want
  foreground banners.
- **iOS gets nothing** → APNs key not uploaded to Firebase, or testing on the
  simulator (push needs a real device).
- **Tokens never arrive server-side** → check the device is signed in (registration
  requires a Supabase session) and `API_BASE` points at the deployed site.
