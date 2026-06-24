import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../api.dart';
import '../models.dart';
import '../theme.dart';
import 'store_screen.dart';

class StoresScreen extends StatefulWidget {
  const StoresScreen({super.key});
  @override
  State<StoresScreen> createState() => _StoresScreenState();
}

class _StoresScreenState extends State<StoresScreen> {
  late Future<List<Store>> _future = Api.instance.stores();
  String _q = '';

  List<Store> _filter(List<Store> all) {
    if (_q.isEmpty) return all;
    final q = _q.toLowerCase();
    return all
        .where((s) => s.name.toLowerCase().contains(q) || (s.bio ?? '').toLowerCase().contains(q))
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Stores')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 10),
            child: TextField(
              decoration: const InputDecoration(hintText: 'Search stores…', prefixIcon: Icon(Icons.search)),
              onChanged: (v) => setState(() => _q = v),
            ),
          ),
          Expanded(
            child: FutureBuilder<List<Store>>(
              future: _future,
              builder: (context, snap) {
                if (snap.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (snap.hasError) {
                  return Center(child: Text('Couldn\'t load stores.\n${snap.error}', textAlign: TextAlign.center));
                }
                final stores = _filter(snap.data ?? []);
                if (stores.isEmpty) {
                  return Center(child: Text(_q.isEmpty ? 'No stores yet.' : 'No stores match "$_q".'));
                }
                return RefreshIndicator(
                  onRefresh: () async => setState(() => _future = Api.instance.stores()),
                  child: GridView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                    gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                      maxCrossAxisExtent: 320,
                      childAspectRatio: 0.92,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                    ),
                    itemCount: stores.length,
                    itemBuilder: (context, i) => _StoreCard(store: stores[i]),
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

class _StoreCard extends StatelessWidget {
  final Store store;
  const _StoreCard({required this.store});

  @override
  Widget build(BuildContext context) {
    final brand = context.brand;
    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: () => Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => StoreScreen(slug: store.slug, name: store.name)),
      ),
      child: Container(
        decoration: BoxDecoration(
          color: brand.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: brand.line),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Cover banner (image or branded gradient with avatar)
            SizedBox(
              height: 74,
              width: double.infinity,
              child: store.coverUrl != null && store.coverUrl!.isNotEmpty
                  ? CachedNetworkImage(
                      imageUrl: store.coverUrl!,
                      fit: BoxFit.cover,
                      errorWidget: (_, __, ___) => _gradientBanner(context),
                    )
                  : _gradientBanner(context),
            ),
            Transform.translate(
              offset: const Offset(12, -16),
              child: CircleAvatar(
                radius: 16,
                backgroundColor: brand.surface,
                child: CircleAvatar(
                  radius: 14,
                  backgroundColor: Brand.tintDark,
                  child: Text(store.initials,
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: brand.brand)),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(children: [
                    Flexible(
                      child: Text(store.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                    ),
                    if (store.verified)
                      const Padding(
                        padding: EdgeInsets.only(left: 4),
                        child: Icon(Icons.verified, size: 14, color: Colors.green),
                      ),
                  ]),
                  const SizedBox(height: 4),
                  Expanded(
                    child: Text(
                      (store.bio != null && store.bio!.isNotEmpty)
                          ? store.bio!
                          : 'Independent seller on DoyinMart.',
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 12, color: brand.inkSoft, height: 1.3),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(children: [
                    Icon(Icons.inventory_2_outlined, size: 13, color: brand.inkSoft),
                    const SizedBox(width: 4),
                    Text('${store.products} products',
                        style: TextStyle(fontSize: 11, color: brand.inkSoft)),
                    const Spacer(),
                    Text('${store.downloads}+',
                        style: TextStyle(fontSize: 11, color: brand.brand, fontWeight: FontWeight.w600)),
                  ]),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _gradientBanner(BuildContext context) {
    final brand = context.brand.brand;
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [brand, brand.withValues(alpha: 0.65)],
        ),
      ),
    );
  }
}
