import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'config.dart';
import 'models.dart';

String naira(int minor) {
  if (minor == 0) return 'Free';
  final f = NumberFormat.currency(locale: 'en_NG', symbol: '₦', decimalDigits: 0);
  return f.format(minor / 100);
}

/// Thin REST client over the Next.js /api/mobile/* surface. Reads are public;
/// /me sends the Supabase access token. Checkout/payment happen in a WebView of
/// the hardened web flow (see CheckoutWebView), so no money logic lives here.
class Api {
  static final Api instance = Api._();
  Api._();

  Uri _u(String path) => Uri.parse('${Config.apiBase}/api/mobile$path');

  Map<String, String> _authHeaders() {
    final token = Supabase.instance.client.auth.currentSession?.accessToken;
    return {
      'content-type': 'application/json',
      if (token != null) 'authorization': 'Bearer $token',
    };
  }

  Future<List<Product>> catalog({String? q, String? category, String? type}) async {
    final params = <String, String>{
      if (q != null && q.isNotEmpty) 'q': q,
      if (category != null) 'category': category,
      if (type != null) 'type': type,
    };
    final res = await http.get(_u('/catalog').replace(queryParameters: params));
    final body = jsonDecode(res.body) as Map<String, dynamic>;
    return ((body['products'] ?? []) as List).map((p) => Product.fromJson(p)).toList();
  }

  Future<ProductDetail> product(String slug) async {
    final res = await http.get(_u('/products/$slug'));
    if (res.statusCode != 200) throw Exception('Product not found');
    return ProductDetail.fromJson(jsonDecode(res.body));
  }

  Future<List<Store>> stores() async {
    final res = await http.get(_u('/stores'));
    final body = jsonDecode(res.body) as Map<String, dynamic>;
    return ((body['stores'] ?? []) as List).map((s) => Store.fromJson(s)).toList();
  }

  Future<({Map<String, dynamic> store, List<Product> products})> storeDetail(String slug) async {
    final res = await http.get(_u('/stores/$slug'));
    if (res.statusCode == 200) {
      final body = jsonDecode(res.body) as Map<String, dynamic>;
      return (
        store: Map<String, dynamic>.from(body['store'] ?? {}),
        products: ((body['products'] ?? []) as List).map((p) => Product.fromJson(p)).toList(),
      );
    }
    // Fallback (detail endpoint not deployed yet): filter the catalog client-side.
    final all = await catalog();
    final products = all.where((p) => p.vendor.slug == slug).toList();
    final v = products.isNotEmpty ? products.first.vendor : null;
    return (
      store: {'slug': slug, 'name': v?.name ?? slug, 'initials': '', 'verified': v?.verified ?? false, 'bio': ''},
      products: products,
    );
  }

  Future<({List<License> licenses, List<GiftCard> giftCards, List<Store> following})> me() async {
    final res = await http.get(_u('/me'), headers: _authHeaders());
    if (res.statusCode == 401) throw Exception('Please sign in.');
    final body = jsonDecode(res.body) as Map<String, dynamic>;
    return (
      licenses: ((body['licenses'] ?? []) as List).map((l) => License.fromJson(l)).toList(),
      giftCards: ((body['gift_cards'] ?? []) as List).map((g) => GiftCard.fromJson(g)).toList(),
      following: ((body['following'] ?? []) as List).map((s) => Store.fromJson(s)).toList(),
    );
  }

  Future<({int unread, List<AppNotification> items})> notifications() async {
    final res = await http.get(_u('/notifications'), headers: _authHeaders());
    if (res.statusCode == 401) throw Exception('Please sign in.');
    final body = jsonDecode(res.body) as Map<String, dynamic>;
    return (
      unread: (body['unread'] ?? 0) as int,
      items: ((body['notifications'] ?? []) as List).map((n) => AppNotification.fromJson(n)).toList(),
    );
  }

  Future<int> unreadCount() async {
    try {
      final session = Supabase.instance.client.auth.currentSession;
      if (session == null) return 0;
      return (await notifications()).unread;
    } catch (_) {
      return 0;
    }
  }

  Future<void> markNotificationsRead([String? id]) async {
    await http.post(
      _u('/notifications'),
      headers: _authHeaders(),
      body: jsonEncode(id != null ? {'id': id} : {}),
    );
  }

  Future<List<OrderItem>> orders() async {
    final res = await http.get(_u('/orders'), headers: _authHeaders());
    if (res.statusCode == 401) throw Exception('Please sign in.');
    final body = jsonDecode(res.body) as Map<String, dynamic>;
    return ((body['orders'] ?? []) as List).map((o) => OrderItem.fromJson(o)).toList();
  }

  Future<List<Product>> wishlist() async {
    final res = await http.get(_u('/wishlist'), headers: _authHeaders());
    if (res.statusCode == 401) throw Exception('Please sign in.');
    final body = jsonDecode(res.body) as Map<String, dynamic>;
    return ((body['products'] ?? []) as List).map((p) => Product.fromJson(p)).toList();
  }

  /// Toggle saving a product. Returns the new saved state.
  Future<bool> toggleSave(String productId) async {
    final res = await http.post(
      _u('/wishlist'),
      headers: _authHeaders(),
      body: jsonEncode({'product_id': productId}),
    );
    if (res.statusCode != 200) throw Exception('Please sign in to save items.');
    final body = jsonDecode(res.body) as Map<String, dynamic>;
    return body['saved'] == true;
  }

  /// Post a verified-purchase review. Returns (ok, message).
  Future<({bool ok, String message})> postReview({
    required String productId,
    required int rating,
    required String body,
    String? authorName,
  }) async {
    final res = await http.post(
      _u('/reviews'),
      headers: _authHeaders(),
      body: jsonEncode({
        'product_id': productId,
        'rating': rating,
        'body': body,
        if (authorName != null) 'author_name': authorName,
      }),
    );
    final json_ = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode == 200 && json_['ok'] == true) {
      return (ok: true, message: 'Thanks — your review has been posted.');
    }
    return (ok: false, message: (json_['error'] as String?) ?? 'Could not post review.');
  }

  /// Toggle following a store. Returns the new following state.
  Future<bool> toggleFollow(String vendorSlug) async {
    final res = await http.post(
      _u('/follow'),
      headers: _authHeaders(),
      body: jsonEncode({'vendor_slug': vendorSlug}),
    );
    if (res.statusCode != 200) throw Exception('Please sign in to follow stores.');
    final json_ = jsonDecode(res.body) as Map<String, dynamic>;
    return json_['following'] == true;
  }

  /// Returns (ok, message). On success the message is the formatted balance.
  Future<({bool ok, String message})> giftBalance(String code) async {
    final res = await http.post(
      _u('/giftcards/balance'),
      headers: {'content-type': 'application/json'},
      body: jsonEncode({'code': code}),
    );
    final body = jsonDecode(res.body) as Map<String, dynamic>;
    if (body['ok'] == true) {
      return (ok: true, message: 'Balance: ${naira(body['balance_minor'] ?? 0)}');
    }
    return (ok: false, message: (body['error'] as String?) ?? 'That code isn\'t valid.');
  }
}
