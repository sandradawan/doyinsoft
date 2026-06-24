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

  Future<({List<License> licenses, List<GiftCard> giftCards})> me() async {
    final res = await http.get(_u('/me'), headers: _authHeaders());
    if (res.statusCode == 401) throw Exception('Please sign in.');
    final body = jsonDecode(res.body) as Map<String, dynamic>;
    return (
      licenses: ((body['licenses'] ?? []) as List).map((l) => License.fromJson(l)).toList(),
      giftCards: ((body['gift_cards'] ?? []) as List).map((g) => GiftCard.fromJson(g)).toList(),
    );
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
    return (ok: false, message: body['error'] ?? 'That code isn\'t valid.');
  }
}
