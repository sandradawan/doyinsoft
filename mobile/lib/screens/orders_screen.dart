import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../api.dart';
import '../models.dart';
import '../theme.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});
  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  late Future<List<OrderItem>> _future = Api.instance.orders();

  Color _statusColor(BuildContext context, String s) {
    switch (s) {
      case 'paid':
        return Colors.green;
      case 'pending':
        return Colors.orange;
      case 'refunded':
        return context.brand.inkSoft;
      default:
        return context.brand.inkSoft;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Your orders')),
      body: FutureBuilder<List<OrderItem>>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snap.hasError) {
            return Center(child: Text('${snap.error}'.replaceFirst('Exception: ', '')));
          }
          final orders = snap.data ?? [];
          if (orders.isEmpty) {
            return const Center(child: Text('No orders yet.'));
          }
          return RefreshIndicator(
            onRefresh: () async => setState(() {
              _future = Api.instance.orders();
            }),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: orders.length,
              separatorBuilder: (_, __) => Divider(color: context.brand.line, height: 1),
              itemBuilder: (context, i) {
                final o = orders[i];
                final date = o.createdAt.isNotEmpty ? o.createdAt.substring(0, 10) : '';
                return ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(o.productName, style: const TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: Text('$date · ${naira(o.amountMinor)}',
                      style: TextStyle(color: context.brand.inkSoft, fontSize: 12)),
                  trailing: o.downloadUrl != null
                      ? TextButton(
                          onPressed: () =>
                              launchUrl(Uri.parse(o.downloadUrl!), mode: LaunchMode.externalApplication),
                          child: const Text('Download'),
                        )
                      : Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: _statusColor(context, o.status).withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(o.fulfilmentStatus ?? o.status,
                              style: TextStyle(fontSize: 11, color: _statusColor(context, o.status))),
                        ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
