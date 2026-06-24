import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../api.dart';
import '../models.dart';
import '../theme.dart';
import 'product_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late Future<List<Product>> _future;
  String _q = '';

  @override
  void initState() {
    super.initState();
    _future = Api.instance.catalog();
  }

  void _search(String q) {
    setState(() {
      _q = q;
      _future = Api.instance.catalog(q: q);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text.rich(TextSpan(children: [
          TextSpan(text: 'Doyin', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 20)),
          TextSpan(text: 'Mart', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 20, color: Brand.emeraldDark)),
        ])),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
            child: TextField(
              decoration: const InputDecoration(hintText: 'Search products…', prefixIcon: Icon(Icons.search)),
              textInputAction: TextInputAction.search,
              onSubmitted: _search,
            ),
          ),
          Expanded(
            child: FutureBuilder<List<Product>>(
              future: _future,
              builder: (context, snap) {
                if (snap.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (snap.hasError) {
                  return Center(child: Text('Couldn\'t load products.\n${snap.error}', textAlign: TextAlign.center));
                }
                final items = snap.data ?? [];
                if (items.isEmpty) {
                  return Center(child: Text(_q.isEmpty ? 'No products yet.' : 'No results for "$_q".'));
                }
                return RefreshIndicator(
                  onRefresh: () async => _search(_q),
                  child: GridView.builder(
                    padding: const EdgeInsets.all(16),
                    gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                      maxCrossAxisExtent: 220,
                      childAspectRatio: 0.74,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                    ),
                    itemCount: items.length,
                    itemBuilder: (context, i) => _ProductCard(product: items[i]),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _ProductCard extends StatelessWidget {
  final Product product;
  const _ProductCard({required this.product});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: () => Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => ProductScreen(slug: product.slug)),
      ),
      child: Container(
        decoration: BoxDecoration(
          color: context.brand.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: context.brand.line),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(11)),
                child: product.iconUrl != null
                    ? CachedNetworkImage(
                        imageUrl: product.iconUrl!,
                        fit: BoxFit.cover,
                        width: double.infinity,
                        errorWidget: (_, __, ___) => const ColoredBox(color: Colors.black12),
                      )
                    : const ColoredBox(color: Colors.black12, child: Center(child: Icon(Icons.image_outlined))),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(product.name, maxLines: 1, overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                  const SizedBox(height: 2),
                  Text(product.vendor.name, maxLines: 1, overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 12, color: context.brand.inkSoft)),
                  const SizedBox(height: 6),
                  Text(naira(product.priceMinor),
                      style: TextStyle(fontWeight: FontWeight.w700, color: context.brand.brand)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
