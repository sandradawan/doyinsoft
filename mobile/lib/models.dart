class Vendor {
  final String slug;
  final String name;
  final bool verified;
  final String? whatsapp;
  Vendor({required this.slug, required this.name, required this.verified, this.whatsapp});
  factory Vendor.fromJson(Map<String, dynamic> j) => Vendor(
        slug: j['slug'] ?? '',
        name: j['name'] ?? '',
        verified: j['verified'] ?? false,
        whatsapp: j['whatsapp'],
      );
}

class Product {
  final String slug, name, tagline, category, productType, currency;
  final int priceMinor;
  final String? iconUrl;
  final double ratingAvg;
  final int ratingCount;
  final Vendor vendor;
  Product({
    required this.slug,
    required this.name,
    required this.tagline,
    required this.category,
    required this.productType,
    required this.currency,
    required this.priceMinor,
    required this.iconUrl,
    required this.ratingAvg,
    required this.ratingCount,
    required this.vendor,
  });
  factory Product.fromJson(Map<String, dynamic> j) => Product(
        slug: j['slug'] ?? '',
        name: j['name'] ?? '',
        tagline: j['tagline'] ?? '',
        category: j['category'] ?? '',
        productType: j['product_type'] ?? 'digital',
        currency: j['currency'] ?? 'NGN',
        priceMinor: j['price_minor'] ?? 0,
        iconUrl: j['icon_url'],
        ratingAvg: (j['rating_avg'] ?? 0).toDouble(),
        ratingCount: j['rating_count'] ?? 0,
        vendor: Vendor.fromJson(j['vendor'] ?? const {}),
      );
}

class Review {
  final String authorName, body;
  final int rating;
  Review({required this.authorName, required this.body, required this.rating});
  factory Review.fromJson(Map<String, dynamic> j) =>
      Review(authorName: j['author_name'] ?? '', body: j['body'] ?? '', rating: j['rating'] ?? 0);
}

class ProductDetail {
  final Map<String, dynamic> product;
  final List<Review> reviews;
  final String checkoutPath;
  ProductDetail({required this.product, required this.reviews, required this.checkoutPath});
  factory ProductDetail.fromJson(Map<String, dynamic> j) => ProductDetail(
        product: Map<String, dynamic>.from(j['product'] ?? {}),
        reviews: ((j['reviews'] ?? []) as List).map((r) => Review.fromJson(r)).toList(),
        checkoutPath: j['checkout_url'] ?? '',
      );
}

class Store {
  final String slug, name, initials;
  final bool verified;
  final int products, downloads, followers;
  final String? bio, coverUrl;
  Store({
    required this.slug,
    required this.name,
    required this.initials,
    required this.verified,
    required this.products,
    required this.downloads,
    this.followers = 0,
    this.bio,
    this.coverUrl,
  });
  factory Store.fromJson(Map<String, dynamic> j) => Store(
        slug: j['slug'] ?? '',
        name: j['name'] ?? '',
        initials: j['initials'] ?? '',
        verified: j['verified'] ?? false,
        products: j['products'] ?? 0,
        downloads: j['downloads'] ?? 0,
        followers: j['followers'] ?? 0,
        bio: j['bio'],
        coverUrl: j['cover_url'],
      );
}

class AppNotification {
  final String id, type, title, createdAt;
  final String? body, link;
  final bool read;
  AppNotification({
    required this.id,
    required this.type,
    required this.title,
    required this.createdAt,
    required this.read,
    this.body,
    this.link,
  });
  factory AppNotification.fromJson(Map<String, dynamic> j) => AppNotification(
        id: j['id'] ?? '',
        type: j['type'] ?? 'system',
        title: j['title'] ?? '',
        createdAt: j['created_at'] ?? '',
        read: j['read'] ?? false,
        body: j['body'],
        link: j['link'],
      );
}

class OrderItem {
  final String id, productName, productSlug, status, currency, createdAt;
  final String? fulfilmentStatus, downloadUrl;
  final int amountMinor;
  OrderItem({
    required this.id,
    required this.productName,
    required this.productSlug,
    required this.status,
    required this.currency,
    required this.createdAt,
    required this.amountMinor,
    this.fulfilmentStatus,
    this.downloadUrl,
  });
  factory OrderItem.fromJson(Map<String, dynamic> j) => OrderItem(
        id: j['id'] ?? '',
        productName: j['product_name'] ?? 'Order',
        productSlug: j['product_slug'] ?? '',
        status: j['status'] ?? '',
        currency: j['currency'] ?? 'NGN',
        createdAt: j['created_at'] ?? '',
        amountMinor: j['amount_minor'] ?? 0,
        fulfilmentStatus: j['fulfilment_status'],
        downloadUrl: j['download_url'],
      );
}

class License {
  final String key, status, downloadUrl;
  final String productName, productVersion;
  License({
    required this.key,
    required this.status,
    required this.downloadUrl,
    required this.productName,
    required this.productVersion,
  });
  factory License.fromJson(Map<String, dynamic> j) => License(
        key: j['key'] ?? '',
        status: j['status'] ?? '',
        downloadUrl: j['download_url'] ?? '',
        productName: (j['product']?['name']) ?? '',
        productVersion: (j['product']?['version']) ?? '',
      );
}

class GiftCard {
  final String code, status, currency, design;
  final int balanceMinor, initialMinor;
  GiftCard({
    required this.code,
    required this.status,
    required this.currency,
    required this.design,
    required this.balanceMinor,
    required this.initialMinor,
  });
  factory GiftCard.fromJson(Map<String, dynamic> j) => GiftCard(
        code: j['code'] ?? '',
        status: j['status'] ?? '',
        currency: j['currency'] ?? 'NGN',
        design: j['design'] ?? 'classic',
        balanceMinor: j['balance_minor'] ?? 0,
        initialMinor: j['initial_minor'] ?? 0,
      );
}
