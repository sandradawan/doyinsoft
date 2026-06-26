import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart' show MediaType;
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'config.dart';
import 'models.dart';

String naira(int minor) => money(minor, 'NGN');

/// Format a minor amount in its currency (₦ or $).
String money(int minor, String currency) {
  if (minor == 0) return 'Free';
  final usd = currency == 'USD';
  final f = NumberFormat.currency(
    locale: usd ? 'en_US' : 'en_NG',
    symbol: usd ? '\$' : '₦',
    decimalDigits: 0,
  );
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

  /// One page of the catalog (20 items). `hasMore` drives infinite scroll.
  Future<({List<Product> items, bool hasMore})> catalogPage({
    String? q,
    String? category,
    String? type,
    int page = 1,
  }) async {
    final params = <String, String>{
      if (q != null && q.isNotEmpty) 'q': q,
      if (category != null) 'category': category,
      if (type != null) 'type': type,
      'page': '$page',
    };
    final res = await http.get(_u('/catalog').replace(queryParameters: params));
    final body = jsonDecode(res.body) as Map<String, dynamic>;
    final items = ((body['products'] ?? []) as List).map((p) => Product.fromJson(p)).toList();
    return (items: items, hasMore: body['hasMore'] == true);
  }

  /// First page only — for places that just need a quick list (e.g. fallbacks).
  Future<List<Product>> catalog({String? q, String? category, String? type}) async {
    final res = await catalogPage(q: q, category: category, type: type);
    return res.items;
  }

  /// Register this device's FCM token for push (requires a signed-in session).
  Future<void> registerDeviceToken(String token, {String platform = 'android'}) async {
    if (Supabase.instance.client.auth.currentSession == null) return;
    await http.post(
      _u('/device-token'),
      headers: _authHeaders(),
      body: jsonEncode({'token': token, 'platform': platform}),
    );
  }

  /// Unregister a token on sign-out.
  Future<void> unregisterDeviceToken(String token) async {
    if (Supabase.instance.client.auth.currentSession == null) return;
    await http.delete(_u('/device-token').replace(queryParameters: {'token': token}),
        headers: _authHeaders());
  }

  // ---- Vendor: manage own products ----

  /// The signed-in vendor's own products (all statuses). `hasStore` is false if
  /// the user hasn't set up a store yet.
  Future<({bool hasStore, List<Map<String, dynamic>> products})> vendorProducts() async {
    final res = await http.get(_u('/vendor/products'), headers: _authHeaders());
    if (res.statusCode != 200) {
      debugPrint('[vendorProducts] HTTP ${res.statusCode}: ${res.body}');
      return (hasStore: false, products: <Map<String, dynamic>>[]);
    }
    final b = jsonDecode(res.body) as Map<String, dynamic>;
    return (
      hasStore: b['store'] == true,
      products: ((b['products'] ?? []) as List).map((e) => Map<String, dynamic>.from(e)).toList(),
    );
  }

  /// Create (id == null) or update a product. Returns null on success, else an error.
  Future<String?> saveVendorProduct(Map<String, dynamic> body, {String? id}) async {
    final res = id == null
        ? await http.post(_u('/vendor/products'), headers: _authHeaders(), body: jsonEncode(body))
        : await http.patch(_u('/vendor/products'),
            headers: _authHeaders(), body: jsonEncode({...body, 'id': id}));
    if (res.statusCode == 200) return null;
    debugPrint('[saveVendorProduct] HTTP ${res.statusCode}: ${res.body}');
    try {
      return (jsonDecode(res.body) as Map<String, dynamic>)['error'] as String? ??
          'Could not save (${res.statusCode}).';
    } catch (_) {
      return 'Could not save (${res.statusCode}).';
    }
  }

  /// The signed-in vendor's paid sales + totals.
  Future<({List<Map<String, dynamic>> sales, int count, int totalMinor})> vendorSales() async {
    final res = await http.get(_u('/vendor/sales'), headers: _authHeaders());
    if (res.statusCode != 200) return (sales: <Map<String, dynamic>>[], count: 0, totalMinor: 0);
    final b = jsonDecode(res.body) as Map<String, dynamic>;
    return (
      sales: ((b['sales'] ?? []) as List).map((e) => Map<String, dynamic>.from(e)).toList(),
      count: (b['count'] ?? 0) as int,
      totalMinor: (b['total_minor'] ?? 0) as int,
    );
  }

  Future<bool> deleteVendorProduct(String id) async {
    final res = await http.delete(_u('/vendor/products').replace(queryParameters: {'id': id}),
        headers: _authHeaders());
    return res.statusCode == 200;
  }

  /// Upload a product image; returns its public URL or null on failure.
  Future<String?> uploadProductImage(String filePath) async {
    final token = Supabase.instance.client.auth.currentSession?.accessToken;
    if (token == null) return null;
    // MultipartFile defaults to application/octet-stream; set a real image type
    // (derived from the extension) so the server accepts it.
    final ext = filePath.split('.').last.toLowerCase();
    final subtype = ext == 'png'
        ? 'png'
        : ext == 'webp'
            ? 'webp'
            : ext == 'gif'
                ? 'gif'
                : 'jpeg';
    final req = http.MultipartRequest('POST', _u('/vendor/upload'))
      ..headers['authorization'] = 'Bearer $token'
      ..files.add(await http.MultipartFile.fromPath('file', filePath,
          contentType: MediaType('image', subtype)));
    final res = await http.Response.fromStream(await req.send());
    if (res.statusCode != 200) {
      debugPrint('[uploadProductImage] HTTP ${res.statusCode}: ${res.body}');
      return null;
    }
    return (jsonDecode(res.body) as Map<String, dynamic>)['url'] as String?;
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

  Future<
      ({
        List<License> licenses,
        List<GiftCard> giftCards,
        List<Store> following,
        ({String slug, String name})? store
      })> me() async {
    final res = await http.get(_u('/me'), headers: _authHeaders());
    if (res.statusCode == 401) throw Exception('Please sign in.');
    final body = jsonDecode(res.body) as Map<String, dynamic>;
    final s = body['store'];
    return (
      licenses: ((body['licenses'] ?? []) as List).map((l) => License.fromJson(l)).toList(),
      giftCards: ((body['gift_cards'] ?? []) as List).map((g) => GiftCard.fromJson(g)).toList(),
      following: ((body['following'] ?? []) as List).map((s) => Store.fromJson(s)).toList(),
      store: s != null ? (slug: (s['slug'] ?? '') as String, name: (s['name'] ?? '') as String) : null,
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

  Future<void> deleteAccount() async {
    final res = await http.post(_u('/account/delete'), headers: _authHeaders());
    if (res.statusCode != 200) {
      final body = jsonDecode(res.body) as Map<String, dynamic>;
      throw Exception(body['error'] ?? 'Could not delete account.');
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
      return (ok: true, message: 'Balance: ${money(body['balance_minor'] ?? 0, body['currency'] ?? 'NGN')}');
    }
    return (ok: false, message: (body['error'] as String?) ?? 'That code isn\'t valid.');
  }
}
