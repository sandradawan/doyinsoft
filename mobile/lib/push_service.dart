import 'dart:io' show Platform;

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

import 'api.dart';

/// Background/terminated-state message handler. Must be a top-level, annotated
/// function — it runs in its own isolate. The OS draws the notification; we only
/// need this registered for delivery to work when the app isn't foregrounded.
@pragma('vm:entry-point')
Future<void> firebaseBackgroundHandler(RemoteMessage message) async {}

/// All push wiring. Every call is guarded so a missing/failed Firebase setup can
/// never crash the app — push just stays inert until it's configured.
class PushService {
  static bool _ready = false;
  static String? _lastToken;

  /// Call once at startup (after Supabase.initialize).
  static Future<void> init() async {
    try {
      await Firebase.initializeApp(); // Android reads google-services.json natively
      FirebaseMessaging.onBackgroundMessage(firebaseBackgroundHandler);
      await FirebaseMessaging.instance.requestPermission(); // iOS prompt; Android 13+ runtime
      await FirebaseMessaging.instance.setForegroundNotificationPresentationOptions(
        alert: true,
        badge: true,
        sound: true,
      );
      _ready = true;
      debugPrint('Push ready (project initialised).');
    } catch (e) {
      debugPrint('Push disabled (Firebase init failed): $e');
    }
  }

  static String get _platform => Platform.isIOS ? 'ios' : 'android';

  /// Register this device's token for the signed-in user. Safe to call repeatedly.
  static Future<void> registerForUser() async {
    if (!_ready) return;
    try {
      final token = await FirebaseMessaging.instance.getToken();
      if (token != null) {
        _lastToken = token;
        await Api.instance.registerDeviceToken(token, platform: _platform);
        debugPrint('Push token registered: ${token.substring(0, 12)}…');
      }
      FirebaseMessaging.instance.onTokenRefresh.listen((t) {
        _lastToken = t;
        Api.instance.registerDeviceToken(t, platform: _platform);
      });
    } catch (e) {
      debugPrint('registerForUser failed: $e');
    }
  }

  /// Unregister on sign-out so the user stops getting pushes on this device.
  static Future<void> unregister() async {
    if (!_ready) return;
    try {
      final token = _lastToken ?? await FirebaseMessaging.instance.getToken();
      if (token != null) await Api.instance.unregisterDeviceToken(token);
    } catch (_) {}
  }
}
