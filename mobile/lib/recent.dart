import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

/// Locally-stored "recently viewed" products (slug, name, price, icon).
class RecentViews {
  static const _key = 'recent_products';
  static const _max = 12;

  static Future<void> add(Map<String, dynamic> product) async {
    final prefs = await SharedPreferences.getInstance();
    final list = prefs.getStringList(_key) ?? [];
    list.removeWhere((e) {
      try {
        return (jsonDecode(e) as Map)['slug'] == product['slug'];
      } catch (_) {
        return false;
      }
    });
    list.insert(0, jsonEncode(product));
    await prefs.setStringList(_key, list.take(_max).toList());
  }

  static Future<List<Map<String, dynamic>>> get() async {
    final prefs = await SharedPreferences.getInstance();
    return (prefs.getStringList(_key) ?? [])
        .map((e) {
          try {
            return jsonDecode(e) as Map<String, dynamic>;
          } catch (_) {
            return <String, dynamic>{};
          }
        })
        .where((m) => m.isNotEmpty)
        .toList();
  }
}
