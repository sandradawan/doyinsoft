import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:share_plus/share_plus.dart';

import '../api.dart';
import '../config.dart';
import '../models.dart';
import '../theme.dart';
import '../widgets/product_card.dart';

class StoreScreen extends StatefulWidget {
  final String slug;
  final String? name;
  const StoreScreen({super.key, required this.slug, this.name});
  @override
  State<StoreScreen> createState() => _StoreScreenState();
}

class _StoreScreenState extends State<StoreScreen> {
  late Future<({Map<String, dynamic> store, List<Product> products})> _future;
  bool _followBusy = false;

  @override
  void initState() {
    super.initState();
    _future = Api.instance.storeDetail(widget.slug);
  }

  Future<void> _follow() async {
    setState(() => _followBusy = true);
    try {
      final following = await Api.instance.toggleFollow(widget.slug);
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(following ? 'Following this store' : 'Unfollowed')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('$e'.replaceFirst('Exception: ', ''))));
      }
    } finally {
      if (mounted) setState(() => _followBusy = false);
    }
  }

  String get _link => '${Config.apiBase}/store/${widget.slug}';

  Future<void> _whatsapp(String number) async {
    final digits = number.replaceAll(RegExp(r'[^0-9]'), '');
    final text = Uri.encodeComponent('Hi, I found your store on DoyinMart: $_link');
    final uri = Uri.parse('https://wa.me/$digits?text=$text');
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication) && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Could not open WhatsApp.')));
    }
  }

  void _share(String name) => Share.share('Check out $name on DoyinMart: $_link');

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.name ?? 'Store')),
      body: FutureBuilder<({Map<String, dynamic> store, List<Product> products})>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snap.hasError || !snap.hasData) {
            return Center(child: Text('Couldn\'t load this store.\n${snap.error ?? ''}', textAlign: TextAlign.center));
          }
          final store = snap.data!.store;
          final products = snap.data!.products;
          return CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(children: [
                        CircleAvatar(
                          radius: 26,
                          backgroundColor: Brand.tintDark,
                          child: Text(store['initials'] ?? '?',
                              style: TextStyle(color: context.brand.brand, fontWeight: FontWeight.w700, fontSize: 18)),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(children: [
                                Flexible(
                                    child: Text(store['name'] ?? '',
                                        style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w600))),
                                if (store['verified'] == true)
                                  const Padding(
                                    padding: EdgeInsets.only(left: 6),
                                    child: Icon(Icons.verified, size: 18, color: Colors.green),
                                  ),
                              ]),
                              Text('${products.length} products', style: TextStyle(color: context.brand.inkSoft)),
                            ],
                          ),
                        ),
                      ]),
                      if ((store['bio'] ?? '').toString().isNotEmpty) ...[
                        const SizedBox(height: 12),
                        Text(store['bio'], style: const TextStyle(height: 1.4)),
                      ],
                      const SizedBox(height: 14),
                      Row(children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: _followBusy ? null : _follow,
                            icon: const Icon(Icons.add, size: 18),
                            label: const Text('Follow'),
                          ),
                        ),
                        if ((store['whatsapp'] ?? '').toString().isNotEmpty) ...[
                          const SizedBox(width: 8),
                          OutlinedButton(
                            onPressed: () => _whatsapp(store['whatsapp']),
                            style: OutlinedButton.styleFrom(
                                minimumSize: const Size(48, 44), padding: EdgeInsets.zero),
                            child: const Icon(Icons.chat_outlined, size: 20),
                          ),
                        ],
                        const SizedBox(width: 8),
                        OutlinedButton(
                          onPressed: () => _share(store['name'] ?? 'this store'),
                          style: OutlinedButton.styleFrom(
                              minimumSize: const Size(48, 44), padding: EdgeInsets.zero),
                          child: const Icon(Icons.share_outlined, size: 20),
                        ),
                      ]),
                      const SizedBox(height: 8),
                      const Text('Products', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
                    ],
                  ),
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                sliver: SliverGrid(
                  gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                    maxCrossAxisExtent: 220,
                    childAspectRatio: 0.74,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                  ),
                  delegate: SliverChildBuilderDelegate(
                    (context, i) => ProductCard(product: products[i]),
                    childCount: products.length,
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
