import 'package:flutter/material.dart';

import 'screens/gift_cards_screen.dart';
import 'screens/account_screen.dart';
import 'screens/product_screen.dart';
import 'screens/notifications_screen.dart';
import 'screens/vendor_sales_screen.dart';

/// Routes a tapped push notification to the right screen, using the server's
/// `data.link` (e.g. "/gift-cards", "/products/<slug>", "/account"). Holds the
/// app's navigator key and a pending link for taps that cold-start the app.
class NotificationRouter {
  static final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

  /// Set when a notification launches the app from terminated state; consumed by
  /// RootShell once it's on screen (so we don't navigate before the UI exists).
  static String? pendingLink;

  /// Handle a tap while the app is already running (or queue it if not ready).
  static void handle(String? link) {
    if (link == null || link.isEmpty) return;
    final nav = navigatorKey.currentState;
    if (nav == null) {
      pendingLink = link;
      return;
    }
    final screen = _screenFor(link);
    if (screen != null) nav.push(MaterialPageRoute(builder: (_) => screen));
  }

  /// Called by RootShell after first frame to handle a launch-from-notification.
  static void consumePending() {
    final link = pendingLink;
    pendingLink = null;
    if (link != null) handle(link);
  }

  static Widget? _screenFor(String link) {
    if (link.startsWith('/gift-cards')) return const GiftCardsScreen();
    if (link.startsWith('/products/')) {
      final slug = link.substring('/products/'.length).split('?').first;
      if (slug.isNotEmpty) return ProductScreen(slug: slug);
    }
    // Vendor sale / dashboard → the vendor's Sales screen.
    if (link.startsWith('/vendor')) return const VendorSalesScreen();
    // Order ready (/account), affiliate → the Account area.
    if (link.startsWith('/account') || link.startsWith('/affiliate')) {
      return const AccountScreen();
    }
    // Anything else: show the in-app notifications list.
    return const NotificationsScreen();
  }
}
