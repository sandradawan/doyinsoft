import 'package:flutter/material.dart';

import '../api.dart';
import '../models.dart';
import '../theme.dart';
import '../widgets/product_card.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

const _types = [
  (label: 'All', value: null),
  (label: 'Software', value: 'digital'),
  (label: 'Physical', value: 'physical'),
  (label: 'Services', value: 'service'),
];

class _HomeScreenState extends State<HomeScreen> {
  late Future<List<Product>> _future;
  String _q = '';
  String? _type;

  @override
  void initState() {
    super.initState();
    _future = Api.instance.catalog();
  }

  void _reload() {
    setState(() => _future = Api.instance.catalog(q: _q, type: _type));
  }

  void _search(String q) {
    _q = q;
    _reload();
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
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
            child: TextField(
              decoration: const InputDecoration(hintText: 'Search products…', prefixIcon: Icon(Icons.search)),
              textInputAction: TextInputAction.search,
              onSubmitted: _search,
            ),
          ),
          SizedBox(
            height: 38,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12),
              children: _types.map((t) {
                final selected = _type == t.value;
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: ChoiceChip(
                    label: Text(t.label),
                    selected: selected,
                    onSelected: (_) {
                      _type = t.value;
                      _reload();
                    },
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 6),
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
                    itemBuilder: (context, i) => ProductCard(product: items[i]),
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
