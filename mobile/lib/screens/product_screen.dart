import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../api.dart';
import '../models.dart';
import '../theme.dart';
import 'checkout_webview.dart';

/// Swipeable screenshots/icon carousel with page indicator + tap-to-zoom.
class _ImageCarousel extends StatefulWidget {
  final List<String> images;
  const _ImageCarousel({required this.images});
  @override
  State<_ImageCarousel> createState() => _ImageCarouselState();
}

class _ImageCarouselState extends State<_ImageCarousel> {
  final _controller = PageController();
  int _page = 0;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _zoom(int index) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => Scaffold(
          backgroundColor: Colors.black,
          appBar: AppBar(backgroundColor: Colors.black, foregroundColor: Colors.white),
          body: Center(
            child: InteractiveViewer(
              child: CachedNetworkImage(imageUrl: widget.images[index], fit: BoxFit.contain),
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(14),
          child: SizedBox(
            height: 200,
            child: PageView.builder(
              controller: _controller,
              onPageChanged: (i) => setState(() => _page = i),
              itemCount: widget.images.length,
              itemBuilder: (context, i) => GestureDetector(
                onTap: () => _zoom(i),
                child: CachedNetworkImage(
                  imageUrl: widget.images[i],
                  fit: BoxFit.cover,
                  width: double.infinity,
                  errorWidget: (_, __, ___) => const ColoredBox(color: Colors.black12),
                ),
              ),
            ),
          ),
        ),
        if (widget.images.length > 1) ...[
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(widget.images.length, (i) {
              final active = i == _page;
              return AnimatedContainer(
                duration: const Duration(milliseconds: 250),
                margin: const EdgeInsets.symmetric(horizontal: 3),
                width: active ? 18 : 6,
                height: 6,
                decoration: BoxDecoration(
                  color: active ? Theme.of(context).colorScheme.primary : Theme.of(context).dividerColor,
                  borderRadius: BorderRadius.circular(3),
                ),
              );
            }),
          ),
        ],
      ],
    );
  }
}

/// Simple rating + comment dialog. Returns (rating, body) or null on cancel.
class _ReviewDialog extends StatefulWidget {
  const _ReviewDialog();
  @override
  State<_ReviewDialog> createState() => _ReviewDialogState();
}

class _ReviewDialogState extends State<_ReviewDialog> {
  int _rating = 5;
  final _body = TextEditingController();

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Write a review'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(5, (i) {
              final filled = i < _rating;
              return IconButton(
                onPressed: () => setState(() => _rating = i + 1),
                icon: Icon(filled ? Icons.star : Icons.star_border, color: Colors.amber),
              );
            }),
          ),
          TextField(
            controller: _body,
            maxLines: 3,
            decoration: const InputDecoration(hintText: 'Share your experience (optional)'),
          ),
        ],
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
        ElevatedButton(
          onPressed: () => Navigator.pop(context, (rating: _rating, body: _body.text.trim())),
          child: const Text('Post'),
        ),
      ],
    );
  }
}

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

  void _snack(String msg) {
    if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  Future<void> _follow(String vendorSlug) async {
    try {
      final following = await Api.instance.toggleFollow(vendorSlug);
      _snack(following ? 'Following this store' : 'Unfollowed');
    } catch (e) {
      _snack('$e'.replaceFirst('Exception: ', ''));
    }
  }

  Future<void> _review(String productId) async {
    final result = await showDialog<({int rating, String body})>(
      context: context,
      builder: (_) => const _ReviewDialog(),
    );
    if (result == null) return;
    final res = await Api.instance.postReview(
      productId: productId,
      rating: result.rating,
      body: result.body,
    );
    _snack(res.message);
    if (res.ok) setState(() => _future = Api.instance.product(widget.slug));
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
          final screenshots = ((p['screenshots'] as List?) ?? const []).cast<String>();
          final images = <String>[if (icon != null) icon, ...screenshots];
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              if (images.isNotEmpty) _ImageCarousel(images: images),
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
              const SizedBox(height: 14),
              Row(children: [
                OutlinedButton.icon(
                  onPressed: () => _follow(p['vendor']?['slug'] ?? ''),
                  icon: const Icon(Icons.add, size: 18),
                  label: const Text('Follow store'),
                ),
                const SizedBox(width: 8),
                OutlinedButton.icon(
                  onPressed: () => _review(p['id'] ?? ''),
                  icon: const Icon(Icons.rate_review_outlined, size: 18),
                  label: const Text('Review'),
                ),
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
