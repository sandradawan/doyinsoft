import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../api.dart';
import '../theme.dart';
import 'product_edit_screen.dart';

/// A vendor's product manager: list, add, edit, delete their own products.
class MyStoreScreen extends StatefulWidget {
  const MyStoreScreen({super.key});
  @override
  State<MyStoreScreen> createState() => _MyStoreScreenState();
}

class _MyStoreScreenState extends State<MyStoreScreen> {
  late Future<({bool hasStore, List<Map<String, dynamic>> products})> _future;

  @override
  void initState() {
    super.initState();
    _future = Api.instance.vendorProducts();
  }

  void _reload() => setState(() => _future = Api.instance.vendorProducts());

  Future<void> _add() async {
    final saved = await Navigator.push<bool>(
        context, MaterialPageRoute(builder: (_) => const ProductEditScreen()));
    if (saved == true) _reload();
  }

  Future<void> _edit(Map<String, dynamic> p) async {
    final saved = await Navigator.push<bool>(
        context, MaterialPageRoute(builder: (_) => ProductEditScreen(product: p)));
    if (saved == true) _reload();
  }

  Future<void> _delete(Map<String, dynamic> p) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Delete product?'),
        content: Text('“${p['name']}” will be removed permanently.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    final done = await Api.instance.deleteVendorProduct(p['id'] as String);
    if (!mounted) return;
    if (done) {
      _reload();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Could not delete.')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My products')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _add,
        icon: const Icon(Icons.add),
        label: const Text('Add product'),
      ),
      body: FutureBuilder<({bool hasStore, List<Map<String, dynamic>> products})>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          final data = snap.data;
          if (data == null || !data.hasStore) {
            return _empty(
              icon: Icons.storefront_outlined,
              title: 'No store yet',
              body: 'Set up your store first, then you can add products here.',
            );
          }
          if (data.products.isEmpty) {
            return _empty(
              icon: Icons.inventory_2_outlined,
              title: 'No products yet',
              body: 'Tap “Add product” to list your first item.',
            );
          }
          return RefreshIndicator(
            onRefresh: () async => _reload(),
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 96),
              itemCount: data.products.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (context, i) => _row(data.products[i]),
            ),
          );
        },
      ),
    );
  }

  Widget _row(Map<String, dynamic> p) {
    final icon = p['icon_url'] as String?;
    final price = money((p['price_minor'] ?? 0) as int, (p['currency'] ?? 'NGN') as String);
    return Container(
      decoration: BoxDecoration(
        color: context.brand.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: context.brand.line),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        leading: ClipRRect(
          borderRadius: BorderRadius.circular(10),
          child: SizedBox(
            width: 48,
            height: 48,
            child: (icon != null && icon.isNotEmpty)
                ? CachedNetworkImage(imageUrl: icon, fit: BoxFit.cover)
                : ColoredBox(
                    color: Colors.black12,
                    child: Icon(Icons.image_outlined, color: context.brand.inkSoft)),
          ),
        ),
        title: Text(p['name']?.toString() ?? '',
            maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Row(children: [
            Text(price, style: TextStyle(color: context.brand.brand, fontWeight: FontWeight.w700, fontSize: 13)),
            const SizedBox(width: 8),
            _statusBadge(p['status']?.toString() ?? 'pending'),
          ]),
        ),
        trailing: PopupMenuButton<String>(
          onSelected: (v) => v == 'edit' ? _edit(p) : _delete(p),
          itemBuilder: (_) => const [
            PopupMenuItem(value: 'edit', child: Text('Edit')),
            PopupMenuItem(value: 'delete', child: Text('Delete')),
          ],
        ),
        onTap: () => _edit(p),
      ),
    );
  }

  Widget _statusBadge(String status) {
    final (color, bg) = switch (status) {
      'approved' => (const Color(0xFF067647), const Color(0xFFE7F6EC)),
      'rejected' => (const Color(0xFFB42318), const Color(0xFFFEE4E2)),
      _ => (const Color(0xFF93651B), const Color(0xFFFDF3E2)),
    };
    final label = status == 'approved' ? 'Live' : (status == 'rejected' ? 'Rejected' : 'In review');
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(20)),
      child: Text(label, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600)),
    );
  }

  Widget _empty({required IconData icon, required String title, required String body}) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 44, color: context.brand.inkSoft),
            const SizedBox(height: 12),
            Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
            const SizedBox(height: 6),
            Text(body, textAlign: TextAlign.center, style: TextStyle(color: context.brand.inkSoft)),
          ],
        ),
      ),
    );
  }
}
