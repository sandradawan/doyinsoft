import 'package:flutter/material.dart';

import '../api.dart';
import '../models.dart';
import '../theme.dart';
import 'product_screen.dart';
import 'checkout_webview.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});
  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  late Future<({int unread, List<AppNotification> items})> _future;

  @override
  void initState() {
    super.initState();
    _future = Api.instance.notifications();
    // Mark all read when the inbox is opened.
    Api.instance.markNotificationsRead();
  }

  IconData _icon(String type) {
    switch (type) {
      case 'order':
        return Icons.shopping_bag_outlined;
      case 'gift':
        return Icons.card_giftcard_outlined;
      case 'launch':
        return Icons.new_releases_outlined;
      case 'affiliate':
        return Icons.payments_outlined;
      default:
        return Icons.notifications_outlined;
    }
  }

  void _open(AppNotification n) {
    final link = n.link ?? '';
    if (link.startsWith('/products/')) {
      Navigator.push(context,
          MaterialPageRoute(builder: (_) => ProductScreen(slug: link.replaceFirst('/products/', ''))));
    } else if (link.isNotEmpty) {
      Navigator.push(context,
          MaterialPageRoute(builder: (_) => CheckoutWebView(path: link, title: 'DoyinMart')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Notifications')),
      body: FutureBuilder<({int unread, List<AppNotification> items})>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snap.hasError) {
            return Center(child: Text('${snap.error}'.replaceFirst('Exception: ', '')));
          }
          final items = snap.data!.items;
          if (items.isEmpty) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.notifications_none, size: 42, color: context.brand.inkSoft),
                  const SizedBox(height: 10),
                  const Text('No notifications yet.'),
                ],
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: () async => setState(() => _future = Api.instance.notifications()),
            child: ListView.separated(
              itemCount: items.length,
              separatorBuilder: (_, __) => Divider(color: context.brand.line, height: 1),
              itemBuilder: (context, i) {
                final n = items[i];
                final date = n.createdAt.length >= 10 ? n.createdAt.substring(0, 10) : '';
                return ListTile(
                  onTap: () => _open(n),
                  leading: CircleAvatar(
                    backgroundColor: n.read ? context.brand.surface : Brand.tintDark,
                    child: Icon(_icon(n.type), size: 20, color: context.brand.brand),
                  ),
                  title: Text(n.title,
                      style: TextStyle(fontWeight: n.read ? FontWeight.w500 : FontWeight.w700)),
                  subtitle: Text(
                    [if (n.body != null && n.body!.isNotEmpty) n.body!, date].join('  ·  '),
                    style: TextStyle(color: context.brand.inkSoft, fontSize: 12),
                  ),
                  trailing: n.link != null ? const Icon(Icons.chevron_right, size: 18) : null,
                );
              },
            ),
          );
        },
      ),
    );
  }
}
