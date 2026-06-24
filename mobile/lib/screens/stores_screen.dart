import 'package:flutter/material.dart';

import '../api.dart';
import '../models.dart';
import '../theme.dart';
import '../widgets/skeletons.dart';
import 'store_screen.dart';

const _pageSize = 6; // 2-col grid → 3 rows per page

class StoresScreen extends StatefulWidget {
  const StoresScreen({super.key});
  @override
  State<StoresScreen> createState() => _StoresScreenState();
}

class _StoresScreenState extends State<StoresScreen> {
  late Future<List<Store>> _future = Api.instance.stores();
  String _q = '';
  int _page = 0;

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
              onChanged: (v) => setState(() {
                _q = v;
                _page = 0;
              }),
            ),
          ),
          Expanded(
            child: FutureBuilder<List<Store>>(
              future: _future,
              builder: (context, snap) {
                if (snap.connectionState == ConnectionState.waiting) {
                  return const GridSkeleton(count: 6, aspect: 0.92);
                }
                if (snap.hasError) {
                  return Center(child: Text('Couldn\'t load stores.\n${snap.error}', textAlign: TextAlign.center));
                }
                final all = _filter(snap.data ?? []);
                if (all.isEmpty) {
                  return Center(child: Text(_q.isEmpty ? 'No stores yet.' : 'No stores match "$_q".'));
                }
                final pages = (all.length / _pageSize).ceil();
                if (_page >= pages) _page = pages - 1;
                final items = all.skip(_page * _pageSize).take(_pageSize).toList();

                return Column(
                  children: [
                    Expanded(
                      child: RefreshIndicator(
                        onRefresh: () async => setState(() => _future = Api.instance.stores()),
                        child: GridView.builder(
                          padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
                          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 2,
                            childAspectRatio: 0.92,
                            crossAxisSpacing: 10,
                            mainAxisSpacing: 10,
                          ),
                          itemCount: items.length,
                          itemBuilder: (context, i) => _StoreCard(store: items[i]),
                        ),
                      ),
                    ),
                    if (pages > 1) _pager(context, pages, all.length),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _pager(BuildContext context, int pages, int total) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(border: Border(top: BorderSide(color: context.brand.line))),
      child: Row(
        children: [
          Text('$total stores', style: TextStyle(fontSize: 12, color: context.brand.inkSoft)),
          const Spacer(),
          IconButton(
            visualDensity: VisualDensity.compact,
            onPressed: _page > 0 ? () => setState(() => _page--) : null,
            icon: const Icon(Icons.chevron_left),
          ),
          Text('${_page + 1} / $pages', style: const TextStyle(fontWeight: FontWeight.w600)),
          IconButton(
            visualDensity: VisualDensity.compact,
            onPressed: _page < pages - 1 ? () => setState(() => _page++) : null,
            icon: const Icon(Icons.chevron_right),
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
    final hasCover = store.coverUrl != null && store.coverUrl!.isNotEmpty;
    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: () => Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => StoreScreen(slug: store.slug, name: store.name)),
      ),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: brand.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: brand.line),
        ),
        child: Column(
          children: [
            CircleAvatar(
              radius: 24,
              backgroundColor: Brand.tintDark,
              backgroundImage: hasCover ? NetworkImage(store.coverUrl!) : null,
              child: hasCover
                  ? null
                  : Text(store.initials,
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: brand.brand)),
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Flexible(
                  child: Text(store.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                ),
                if (store.verified)
                  const Padding(
                    padding: EdgeInsets.only(left: 3),
                    child: Icon(Icons.verified, size: 13, color: Colors.green),
                  ),
              ],
            ),
            const SizedBox(height: 2),
            Expanded(
              child: Text(
                (store.bio != null && store.bio!.isNotEmpty) ? store.bio! : 'Seller on DoyinMart',
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 11, color: brand.inkSoft, height: 1.25),
              ),
            ),
            const SizedBox(height: 6),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _stat(context, Icons.people_alt_outlined, store.followers),
                const SizedBox(width: 12),
                _stat(context, Icons.inventory_2_outlined, store.products),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _stat(BuildContext context, IconData icon, int value) => Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: context.brand.inkSoft),
          const SizedBox(width: 3),
          Text('$value', style: TextStyle(fontSize: 11, color: context.brand.inkSoft, fontWeight: FontWeight.w600)),
        ],
      );
}
