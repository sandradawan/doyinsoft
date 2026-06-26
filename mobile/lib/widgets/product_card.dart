import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../api.dart';
import '../models.dart';
import '../theme.dart';
import '../screens/product_screen.dart';

class ProductCard extends StatelessWidget {
  final Product product;
  const ProductCard({super.key, required this.product});

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
                    : const ColoredBox(
                        color: Colors.black12,
                        child: Center(child: Icon(Icons.image_outlined)),
                      ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(product.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                  const SizedBox(height: 2),
                  Text(product.vendor.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 12, color: context.brand.inkSoft)),
                  const SizedBox(height: 6),
                  Text(money(product.priceMinor, product.currency),
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
