import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';

/// Shimmering placeholder grid shown while products/stores load.
class GridSkeleton extends StatelessWidget {
  final int count;
  final double aspect;
  const GridSkeleton({super.key, this.count = 6, this.aspect = 0.74});

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final base = dark ? const Color(0xFF1E1E22) : const Color(0xFFE9E9E7);
    final hi = dark ? const Color(0xFF2A2A2E) : const Color(0xFFF6F6F4);
    return Shimmer.fromColors(
      baseColor: base,
      highlightColor: hi,
      child: GridView.builder(
        padding: const EdgeInsets.all(16),
        physics: const NeverScrollableScrollPhysics(),
        gridDelegate: SliverGridDelegateWithMaxCrossAxisExtent(
          maxCrossAxisExtent: 220,
          childAspectRatio: aspect,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
        ),
        itemCount: count,
        itemBuilder: (_, __) => Container(
          decoration: BoxDecoration(color: base, borderRadius: BorderRadius.circular(12)),
        ),
      ),
    );
  }
}
