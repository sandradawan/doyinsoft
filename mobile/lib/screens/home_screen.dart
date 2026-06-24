import 'package:flutter/material.dart';

import '../api.dart';
import '../models.dart';
import '../theme.dart';
import '../widgets/product_card.dart';
import '../widgets/featured_carousel.dart';

const _types = [
  (label: 'All', value: null),
  (label: 'Software', value: 'digital'),
  (label: 'Physical', value: 'physical'),
  (label: 'Services', value: 'service'),
];

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late Future<List<Product>> _future;
  late Future<List<Product>> _featured;
  final _searchCtrl = TextEditingController();
  final _searchFocus = FocusNode();
  bool _searching = false;
  String _q = '';
  String? _type;

  @override
  void initState() {
    super.initState();
    _future = Api.instance.catalog();
    _featured = Api.instance.catalog();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    _searchFocus.dispose();
    super.dispose();
  }

  void _reload() => setState(() => _future = Api.instance.catalog(q: _q, type: _type));

  void _toggleSearch() {
    setState(() => _searching = !_searching);
    if (_searching) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _searchFocus.requestFocus());
    } else {
      _searchCtrl.clear();
      if (_q.isNotEmpty) {
        _q = '';
        _reload();
      }
    }
  }

  bool get _showHero => !_searching && _q.isEmpty && _type == null;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        titleSpacing: _searching ? 0 : null,
        title: AnimatedSwitcher(
          duration: const Duration(milliseconds: 250),
          child: _searching
              ? TextField(
                  key: const ValueKey('search'),
                  controller: _searchCtrl,
                  focusNode: _searchFocus,
                  textInputAction: TextInputAction.search,
                  decoration: const InputDecoration(
                    hintText: 'Search products…',
                    border: InputBorder.none,
                    filled: false,
                  ),
                  onSubmitted: (q) {
                    _q = q;
                    _reload();
                  },
                )
              : const Text.rich(
                  key: ValueKey('logo'),
                  TextSpan(children: [
                    TextSpan(text: 'Doyin', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 20)),
                    TextSpan(
                        text: 'Mart',
                        style: TextStyle(fontWeight: FontWeight.w700, fontSize: 20, color: Brand.emeraldDark)),
                  ]),
                ),
        ),
        actions: [
          IconButton(
            icon: Icon(_searching ? Icons.close : Icons.search),
            onPressed: _toggleSearch,
          ),
        ],
      ),
      body: FutureBuilder<List<Product>>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snap.hasError) {
            return _ErrorView(error: '${snap.error}', onRetry: _reload);
          }
          final items = snap.data ?? [];
          return RefreshIndicator(
            onRefresh: () async {
              _featured = Api.instance.catalog();
              _reload();
            },
            child: CustomScrollView(
              slivers: [
                if (_showHero)
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.only(top: 8, bottom: 4),
                      child: FutureBuilder<List<Product>>(
                        future: _featured,
                        builder: (context, f) {
                          final feat = (f.data ?? []).take(6).toList();
                          if (feat.isEmpty) return const SizedBox.shrink();
                          return Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Padding(
                                padding: EdgeInsets.fromLTRB(16, 4, 16, 8),
                                child: Text('Featured', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                              ),
                              FeaturedCarousel(products: feat),
                            ],
                          );
                        },
                      ),
                    ),
                  ),
                SliverToBoxAdapter(
                  child: SizedBox(
                    height: 46,
                    child: ListView(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
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
                ),
                if (items.isEmpty)
                  SliverFillRemaining(
                    hasScrollBody: false,
                    child: Center(child: Text(_q.isEmpty ? 'No products yet.' : 'No results for "$_q".')),
                  )
                else
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(16, 6, 16, 24),
                    sliver: SliverGrid(
                      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                        maxCrossAxisExtent: 220,
                        childAspectRatio: 0.74,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
                      ),
                      delegate: SliverChildBuilderDelegate(
                        (context, i) => ProductCard(product: items[i]),
                        childCount: items.length,
                      ),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  final String error;
  final VoidCallback onRetry;
  const _ErrorView({required this.error, required this.onRetry});
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.cloud_off, size: 36),
            const SizedBox(height: 10),
            Text('Couldn\'t load products.\n$error', textAlign: TextAlign.center),
            const SizedBox(height: 12),
            OutlinedButton(onPressed: onRetry, child: const Text('Retry')),
          ],
        ),
      ),
    );
  }
}
