import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../api.dart';
import '../config.dart';
import '../models.dart';
import '../theme.dart';
import '../theme_controller.dart';
import 'sign_in_screen.dart';
import 'store_screen.dart';
import 'orders_screen.dart';
import 'wishlist_screen.dart';
import 'checkout_webview.dart';

class AccountScreen extends StatefulWidget {
  const AccountScreen({super.key});
  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen> {
  Future<({List<License> licenses, List<GiftCard> giftCards, List<Store> following})>? _future;

  bool get _signedIn =>
      Config.supabaseConfigured && Supabase.instance.client.auth.currentSession != null;

  @override
  void initState() {
    super.initState();
    if (_signedIn) _future = Api.instance.me();
  }

  void _refresh() => setState(() {
        _future = _signedIn ? Api.instance.me() : null;
      });

  void _openWeb(String path, String title) => Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => CheckoutWebView(path: path, title: title)),
      );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Account'),
        centerTitle: true,
        actions: [_themeToggle(), if (_signedIn) _signOutButton()],
      ),
      body: _signedIn ? _buildSignedIn() : _buildSignedOut(),
    );
  }

  // --- Reusable bits -----------------------------------------------------------

  Widget _themeToggle() => ValueListenableBuilder<ThemeMode>(
        valueListenable: ThemeController.instance,
        builder: (context, mode, _) {
          final isDark = mode == ThemeMode.dark ||
              (mode == ThemeMode.system && MediaQuery.platformBrightnessOf(context) == Brightness.dark);
          return IconButton(
            tooltip: isDark ? 'Switch to light' : 'Switch to dark',
            icon: Icon(isDark ? Icons.light_mode_outlined : Icons.dark_mode_outlined),
            onPressed: () => ThemeController.instance.set(isDark ? ThemeMode.light : ThemeMode.dark),
          );
        },
      );

  Widget _signOutButton() => IconButton(
        icon: const Icon(Icons.logout),
        tooltip: 'Sign out',
        onPressed: () async {
          await Supabase.instance.client.auth.signOut();
          _refresh();
        },
      );

  Widget _avatar(String seed, {double radius = 40}) => CircleAvatar(
        radius: radius,
        backgroundColor: Brand.tintDark,
        child: Text((seed.isNotEmpty ? seed[0] : '?').toUpperCase(),
            style: TextStyle(color: context.brand.brand, fontWeight: FontWeight.w700, fontSize: radius * 0.7)),
      );

  Widget _card({required String title, Widget? trailing, required Widget child}) => Container(
        width: double.infinity,
        margin: const EdgeInsets.only(bottom: 14),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: context.brand.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: context.brand.line),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
              const Spacer(),
              if (trailing != null) trailing,
            ]),
            const SizedBox(height: 10),
            child,
          ],
        ),
      );

  Widget _muted(String text) => Text(text, style: TextStyle(color: context.brand.inkSoft));

  Widget _quickTile(IconData icon, String label, VoidCallback onTap) => InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 16),
          decoration: BoxDecoration(
            color: context.brand.surface,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: context.brand.line),
          ),
          child: Column(
            children: [
              Icon(icon, color: context.brand.brand),
              const SizedBox(height: 6),
              Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
            ],
          ),
        ),
      );

  // Facebook-style following row: circular store avatars with names.
  Widget _followingRow(List<Store> following) {
    if (following.isEmpty) return _muted('You\'re not following any stores yet.');
    return SizedBox(
      height: 84,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: following.length,
        separatorBuilder: (_, __) => const SizedBox(width: 14),
        itemBuilder: (context, i) {
          final s = following[i];
          return GestureDetector(
            onTap: () => Navigator.push(
                context, MaterialPageRoute(builder: (_) => StoreScreen(slug: s.slug, name: s.name))),
            child: SizedBox(
              width: 62,
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 26,
                    backgroundColor: Brand.tintDark,
                    child: Text(s.initials,
                        style: TextStyle(color: context.brand.brand, fontWeight: FontWeight.w700)),
                  ),
                  const SizedBox(height: 5),
                  Text(s.name,
                      maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 11)),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _moreTiles() => Row(
        children: [
          _moreTile(Icons.payments_outlined, 'Earn', () => _openWeb('/affiliate', 'Affiliate')),
          _moreTile(Icons.storefront_outlined, 'Sell', () => _openWeb('/vendor/dashboard', 'Vendor')),
          _moreTile(Icons.card_giftcard_outlined, 'Gift cards', () => _openWeb('/gift-cards', 'Gift cards')),
          _moreTile(Icons.description_outlined, 'Legal', () => _openWeb('/legal', 'Legal')),
        ],
      );

  Widget _moreTile(IconData icon, String label, VoidCallback onTap) => Expanded(
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Column(
              children: [
                CircleAvatar(radius: 22, backgroundColor: Brand.tintDark, child: Icon(icon, size: 20, color: context.brand.brand)),
                const SizedBox(height: 6),
                Text(label, style: const TextStyle(fontSize: 11), textAlign: TextAlign.center),
              ],
            ),
          ),
        ),
      );

  // --- Signed-out --------------------------------------------------------------

  Widget _buildSignedOut() {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        const SizedBox(height: 24),
        Center(child: _avatar('?')),
        const SizedBox(height: 16),
        const Center(child: Text('Welcome to DoyinMart', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18))),
        const SizedBox(height: 6),
        Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Text('Sign in to see your purchases, license keys, gift cards and the stores you follow.',
                textAlign: TextAlign.center, style: TextStyle(color: context.brand.inkSoft)),
          ),
        ),
        const SizedBox(height: 20),
        Center(
          child: ElevatedButton(
            onPressed: () async {
              final ok = await Navigator.push<bool>(context, MaterialPageRoute(builder: (_) => const SignInScreen()));
              if (ok == true) _refresh();
            },
            child: const Text('Sign in or create an account'),
          ),
        ),
        const SizedBox(height: 28),
        _card(title: 'More', child: _moreTiles()),
      ],
    );
  }

  // --- Signed-in ---------------------------------------------------------------

  Widget _buildSignedIn() {
    final email = Supabase.instance.client.auth.currentUser?.email ?? '';
    return FutureBuilder<({List<License> licenses, List<GiftCard> giftCards, List<Store> following})>(
      future: _future,
      builder: (context, snap) {
        return RefreshIndicator(
          onRefresh: () async => _refresh(),
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              const SizedBox(height: 8),
              Center(child: _avatar(email)),
              const SizedBox(height: 12),
              Center(child: Text(email, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15))),
              const SizedBox(height: 20),

              // Quick access: Orders + Saved
              Row(children: [
                Expanded(child: _quickTile(Icons.receipt_long_outlined, 'Orders', () => Navigator.push(context, MaterialPageRoute(builder: (_) => const OrdersScreen())))),
                const SizedBox(width: 12),
                Expanded(child: _quickTile(Icons.favorite_border, 'Saved', () => Navigator.push(context, MaterialPageRoute(builder: (_) => const WishlistScreen())))),
              ]),
              const SizedBox(height: 16),

              if (snap.connectionState == ConnectionState.waiting)
                const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator()))
              else if (snap.hasError)
                _card(title: 'Account', child: _muted('Couldn\'t load your account. Pull to refresh.'))
              else ...[
                _card(
                  title: 'Following',
                  trailing: Text('${snap.data!.following.length}',
                      style: TextStyle(color: context.brand.inkSoft, fontWeight: FontWeight.w600)),
                  child: _followingRow(snap.data!.following),
                ),

                if (snap.data!.giftCards.isNotEmpty)
                  _card(
                    title: 'Gift cards',
                    trailing: Text('${snap.data!.giftCards.length}',
                        style: TextStyle(color: context.brand.inkSoft, fontWeight: FontWeight.w600)),
                    child: Column(
                      children: snap.data!.giftCards
                          .map((g) => ListTile(
                                contentPadding: EdgeInsets.zero,
                                dense: true,
                                title: Text(g.code, style: const TextStyle(fontFamily: 'monospace', fontSize: 12)),
                                subtitle: Text(g.status, style: TextStyle(color: context.brand.inkSoft)),
                                trailing: Text(money(g.balanceMinor, g.currency), style: const TextStyle(fontWeight: FontWeight.w700)),
                              ))
                          .toList(),
                    ),
                  ),

                // Minimized purchases: collapsed by default, expands to the list.
                Container(
                  margin: const EdgeInsets.only(bottom: 14),
                  decoration: BoxDecoration(
                    color: context.brand.surface,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: context.brand.line),
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: Theme(
                    data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
                    child: ExpansionTile(
                      tilePadding: const EdgeInsets.symmetric(horizontal: 16),
                      leading: Icon(Icons.shopping_bag_outlined, color: context.brand.brand),
                      title: const Text('Your purchases', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                      trailing: Text('${snap.data!.licenses.length}',
                          style: TextStyle(color: context.brand.inkSoft, fontWeight: FontWeight.w600)),
                      childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                      children: snap.data!.licenses.isEmpty
                          ? [Padding(padding: const EdgeInsets.only(bottom: 12), child: _muted('No purchases yet.'))]
                          : snap.data!.licenses
                              .map((l) => ListTile(
                                    contentPadding: EdgeInsets.zero,
                                    dense: true,
                                    title: Text('${l.productName}  v${l.productVersion}',
                                        style: const TextStyle(fontWeight: FontWeight.w600)),
                                    subtitle: Text(l.key, style: TextStyle(fontSize: 11, color: context.brand.inkSoft)),
                                    trailing: TextButton(
                                      onPressed: () =>
                                          launchUrl(Uri.parse(l.downloadUrl), mode: LaunchMode.externalApplication),
                                      child: const Text('Download'),
                                    ),
                                  ))
                              .toList(),
                    ),
                  ),
                ),
              ],

              _card(title: 'More', child: _moreTiles()),
              const SizedBox(height: 16),
            ],
          ),
        );
      },
    );
  }
}
