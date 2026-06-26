# Push notifications — setup guide

The **server side is already built and wired** (it's dormant until you add a
Firebase service account, so the app builds and runs without it):

- `device_tokens` table (migration **0029**) stores each signed-in device's token.
- `POST /api/mobile/device-token` registers a token; `DELETE` unregisters it.
- `lib/push.ts` sends via **FCM HTTP v1** (no SDK dependency) and prunes dead tokens.
- `notify()` already fires a push for **every** in-app notification — orders paid,
  gift card received, a followed store's launch, etc. So once you finish the steps
  below, those existing events push automatically. No extra server work.

You need a Firebase project + the Flutter client wiring. ~30 minutes.

---

## 1. Create the Firebase project
1. <https://console.firebase.google.com> → **Add project** (e.g. "DoyinMart").
2. You do **not** need Google Analytics.

## 2. Add the Android + iOS apps
1. **Android:** Project → Add app → Android. Package name **must match**
   `mobile/android/app/build.gradle` `applicationId` (e.g. `com.doyinmart.app`).
   Download **`google-services.json`** → place in `mobile/android/app/`.
2. **iOS:** Add app → iOS. Bundle ID must match Xcode. Download
   **`GoogleService-Info.plist`** → add to `ios/Runner/` (via Xcode so it's in the
   target). For iOS push you also need an **APNs auth key** (.p8) from the Apple
   Developer portal, uploaded in Firebase → Project settings → Cloud Messaging.

## 3. Generate the server service account (for `lib/push.ts`)
1. Firebase → ⚙ **Project settings → Service accounts → Generate new private key**.
2. You get a JSON file. Set its **entire contents** as one env var in Vercel:
   - **Name:** `FCM_SERVICE_ACCOUNT`
   - **Value:** the full JSON (paste as-is; Vercel handles the newlines).
   - Server-only — never expose it to the client.
3. Redeploy. `isPushConfigured` flips on and pushes start flowing.

## 4. Wire the Flutter client
Add the dependencies:
```bash
cd mobile
flutter pub add firebase_core firebase_messaging
dart pub global activate flutterfire_cli   # once
flutterfire configure                        # generates lib/firebase_options.dart
```
`flutterfire configure` writes `lib/firebase_options.dart` and links the native files.

Create **`mobile/lib/push_service.dart`**:
```dart
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'dart:io' show Platform;

import 'firebase_options.dart';
import 'api.dart';

/// Push wiring. Every call is guarded so a missing/failed Firebase config can
/// never crash the app — push simply stays inert until it's set up.
class PushService {
  static bool _ready = false;

  static Future<void> init() async {
    try {
      await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
      await FirebaseMessaging.instance.requestPermission(); // iOS prompt; Android auto
      _ready = true;
    } catch (e) {
      debugPrint('Push disabled (Firebase not configured): $e');
    }
  }

  /// Call after sign-in (and on app start if already signed in).
  static Future<void> registerForUser() async {
    if (!_ready) return;
    try {
      final token = await FirebaseMessaging.instance.getToken();
      if (token != null) {
        await Api.instance.registerDeviceToken(token,
            platform: Platform.isIOS ? 'ios' : 'android');
      }
      // A device can refresh its token at any time.
      FirebaseMessaging.instance.onTokenRefresh.listen((t) {
        Api.instance.registerDeviceToken(t, platform: Platform.isIOS ? 'ios' : 'android');
      });
    } catch (e) {
      debugPrint('registerForUser failed: $e');
    }
  }

  /// Call on sign-out.
  static Future<void> unregister() async {
    if (!_ready) return;
    try {
      final token = await FirebaseMessaging.instance.getToken();
      if (token != null) await Api.instance.unregisterDeviceToken(token);
    } catch (_) {}
  }
}
```

Wire it into **`mobile/lib/main.dart`** (after `Supabase.initialize`):
```dart
await Supabase.initialize(url: Config.supabaseUrl, anonKey: Config.supabaseAnonKey);
await PushService.init();
if (Supabase.instance.client.auth.currentSession != null) {
  PushService.registerForUser();
}
// React to sign-in / sign-out:
Supabase.instance.client.auth.onAuthStateChange.listen((data) {
  if (data.event == AuthChangeEvent.signedIn) PushService.registerForUser();
  if (data.event == AuthChangeEvent.signedOut) PushService.unregister();
});
```

`Api.registerDeviceToken` / `unregisterDeviceToken` already exist in `lib/api.dart`.

## 5. (Optional) tapping a notification opens a screen
The server sends a `data.link` (e.g. `/gift-cards`). Handle taps:
```dart
FirebaseMessaging.onMessageOpenedApp.listen((m) {
  final link = m.data['link'];
  // route based on link, e.g. push the matching screen
});
```

## 6. Test
1. Apply migration **0029** on Supabase (or run `supabase/setup.sql`).
2. Set `FCM_SERVICE_ACCOUNT` in Vercel and redeploy.
3. Build the app with the Firebase files in place, sign in.
4. Trigger an event (buy a gift card to your own email, or follow a store that
   then launches a product). You should get a push.
5. From the Firebase console → **Messaging → Send test message** you can also push
   to a specific token to verify delivery in isolation.

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
