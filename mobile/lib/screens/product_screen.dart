import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../api.dart';
import '../models.dart';
import '../theme.dart';
import 'checkout_webview.dart';

class ProductScreen extends StatefulWidget {
  final String slug;
  const ProductScreen({super.key, required this.slug});
  @override
  State<ProductScreen> createState() => _ProductScreenState();
}

class _ProductScreenState extends State<ProductScreen> {
  late Future<ProductDetail> _future;

  @override
  void initState() {
    super.initState();
    _future = Api.instance.product(widget.slug);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Product')),
      body: FutureBuilder<ProductDetail>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snap.hasError || !snap.hasData) {
            return Center(child: Text('Couldn\'t load this product.\n${snap.error ?? ''}', textAlign: TextAlign.center));
          }
          final d = snap.data!;
          final p = d.product;
          final priceMinor = (p['price_minor'] ?? 0) as int;
          final icon = p['icon_url'] as String?;
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              if (icon != null)
                ClipRRect(
                  borderRadius: BorderRadius.circular(14),
                  child: CachedNetworkImage(imageUrl: icon, height: 180, width: double.infinity, fit: BoxFit.cover),
                ),
              const SizedBox(height: 14),
              Text(p['name'] ?? '', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w600)),
              const SizedBox(height: 4),
              Text(p['tagline'] ?? '', style: TextStyle(fontSize: 15, color: context.brand.inkSoft)),
              const SizedBox(height: 10),
              Row(children: [
                Text(naira(priceMinor),
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: context.brand.brand)),
                const Spacer(),
                if ((p['rating_count'] ?? 0) > 0)
                  Row(children: [
                    const Icon(Icons.star, size: 16, color: Colors.amber),
                    const SizedBox(width: 4),
                    Text('${p['rating_avg']} (${p['rating_count']})'),
                  ]),
              ]),
              const SizedBox(height: 16),
              if ((p['description'] ?? '').toString().isNotEmpty) ...[
                Text(p['description'], style: const TextStyle(fontSize: 14, height: 1.5)),
                const SizedBox(height: 20),
              ],
              if (d.reviews.isNotEmpty) ...[
                const Text('Reviews', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
                const SizedBox(height: 8),
                ...d.reviews.take(5).map((r) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(children: [
                            Text(r.authorName, style: const TextStyle(fontWeight: FontWeight.w600)),
                            const SizedBox(width: 8),
                            Row(
                                children: List.generate(
                                    r.rating, (_) => const Icon(Icons.star, size: 13, color: Colors.amber))),
                          ]),
                          if (r.body.isNotEmpty) Text(r.body, style: TextStyle(color: context.brand.inkSoft)),
                        ],
                      ),
                    )),
                const SizedBox(height: 80),
              ],
            ],
          );
        },
      ),
      bottomNavigationBar: FutureBuilder<ProductDetail>(
        future: _future,
        builder: (context, snap) {
          if (!snap.hasData) return const SizedBox.shrink();
          return SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: ElevatedButton(
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => CheckoutWebView(path: snap.data!.checkoutPath, title: 'Checkout'),
                  ),
                ),
                child: Text('Buy — ${naira((snap.data!.product['price_minor'] ?? 0) as int)}'),
              ),
            ),
          );
        },
      ),
    );
  }
}
