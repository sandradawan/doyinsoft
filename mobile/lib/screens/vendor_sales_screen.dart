import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../api.dart';
import '../theme.dart';

/// A vendor's sales: total revenue + a list of paid orders.
class VendorSalesScreen extends StatefulWidget {
  const VendorSalesScreen({super.key});
  @override
  State<VendorSalesScreen> createState() => _VendorSalesScreenState();
}

class _VendorSalesScreenState extends State<VendorSalesScreen> {
  late Future<({List<Map<String, dynamic>> sales, int count, int totalMinor})> _future;

  @override
  void initState() {
    super.initState();
    _future = Api.instance.vendorSales();
  }

  void _reload() => setState(() => _future = Api.instance.vendorSales());

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Sales')),
      body: FutureBuilder<({List<Map<String, dynamic>> sales, int count, int totalMinor})>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          final data = snap.data;
          final sales = data?.sales ?? [];
          return RefreshIndicator(
            onRefresh: () async => _reload(),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
              children: [
                _summary(data?.totalMinor ?? 0, data?.count ?? 0),
                const SizedBox(height: 18),
                if (sales.isEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 60),
                    child: Center(
                      child: Column(children: [
                        Icon(Icons.receipt_long_outlined, size: 44, color: context.brand.inkSoft),
                        const SizedBox(height: 12),
                        const Text('No sales yet', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                        const SizedBox(height: 6),
                        Text('Paid orders will show up here.',
                            style: TextStyle(color: context.brand.inkSoft)),
                      ]),
                    ),
                  )
                else
                  ...sales.map(_saleTile),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _summary(int totalMinor, int count) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: context.brand.brand.withOpacity(0.10),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Total revenue', style: TextStyle(color: context.brand.brand, fontSize: 13)),
          const SizedBox(height: 4),
          Text(naira(totalMinor),
              style: TextStyle(color: context.brand.brand, fontSize: 30, fontWeight: FontWeight.w700)),
          const SizedBox(height: 2),
          Text('$count ${count == 1 ? 'sale' : 'sales'}',
              style: TextStyle(color: context.brand.inkSoft, fontSize: 13)),
        ],
      ),
    );
  }

  Widget _saleTile(Map<String, dynamic> s) {
    final when = DateTime.tryParse(s['created_at']?.toString() ?? '');
    final dateStr = when != null ? DateFormat('d MMM, h:mma').format(when.toLocal()) : '';
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: context.brand.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: context.brand.line),
      ),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: context.brand.brand.withOpacity(0.12),
          child: Icon(Icons.payments_outlined, color: context.brand.brand, size: 20),
        ),
        title: Text(s['product_name']?.toString() ?? 'Product',
            maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text('${s['buyer'] ?? 'A customer'} · $dateStr',
            maxLines: 1, overflow: TextOverflow.ellipsis),
        trailing: Text(
          money((s['amount_minor'] ?? 0) as int, (s['currency'] ?? 'NGN') as String),
          style: TextStyle(color: context.brand.brand, fontWeight: FontWeight.w700),
        ),
      ),
    );
  }
}
