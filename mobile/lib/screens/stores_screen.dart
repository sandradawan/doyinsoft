import 'package:flutter/material.dart';

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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Stores')),
      body: FutureBuilder<List<Store>>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          final stores = snap.data ?? [];
          if (stores.isEmpty) return const Center(child: Text('No stores yet.'));
          return RefreshIndicator(
            onRefresh: () async => setState(() => _future = Api.instance.stores()),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: stores.length,
              separatorBuilder: (_, __) => Divider(color: context.brand.line, height: 1),
              itemBuilder: (context, i) {
                final s = stores[i];
                return ListTile(
                  contentPadding: EdgeInsets.zero,
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => StoreScreen(slug: s.slug, name: s.name)),
                  ),
                  trailing: const Icon(Icons.chevron_right, size: 18),
                  leading: CircleAvatar(
                    backgroundColor: Brand.tintDark,
                    child: Text(s.initials, style: TextStyle(color: context.brand.brand, fontWeight: FontWeight.w600)),
                  ),
                  title: Row(children: [
                    Flexible(child: Text(s.name, overflow: TextOverflow.ellipsis)),
                    if (s.verified) const Padding(
                      padding: EdgeInsets.only(left: 4),
                      child: Icon(Icons.verified, size: 15, color: Colors.green),
                    ),
                  ]),
                  subtitle: Text('${s.products} products · ${s.downloads} downloads',
                      style: TextStyle(color: context.brand.inkSoft)),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
