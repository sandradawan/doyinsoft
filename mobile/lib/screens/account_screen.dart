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

  void _refresh() => setState(() => _future = _signedIn ? Api.instance.me() : null);

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
        actions: [
          if (_signedIn)
            IconButton(
              icon: const Icon(Icons.logout),
              tooltip: 'Sign out',
              onPressed: () async {
                await Supabase.instance.client.auth.signOut();
                _refresh();
              },
            ),
        ],
      ),
      body: _signedIn ? _buildSignedIn() : _buildSignedOut(),
    );
  }

  // --- Reusable bits -----------------------------------------------------------

  Widget _avatar(String seed, {double radius = 40}) => CircleAvatar(
        radius: radius,
        backgroundColor: Brand.tintDark,
        child: Text(
          (seed.isNotEmpty ? seed[0] : '?').toUpperCase(),
          style: TextStyle(color: context.brand.brand, fontWeight: FontWeight.w700, fontSize: radius * 0.7),
        ),
      );

  Widget _card({required String title, required Widget child}) => Container(
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
            Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
            const SizedBox(height: 10),
            child,
          ],
        ),
      );

  Widget _muted(String text) => Text(text, style: TextStyle(color: context.brand.inkSoft));

  Widget _themeCard() => _card(
        title: 'Appearance',
        child: Row(
          children: [
            Icon(Icons.brightness_6_outlined, size: 20, color: context.brand.inkSoft),
            const SizedBox(width: 10),
            const Text('Theme'),
            const Spacer(),
            ValueListenableBuilder<ThemeMode>(
              valueListenable: ThemeController.instance,
              builder: (context, mode, _) => SegmentedButton<ThemeMode>(
                style: const ButtonStyle(visualDensity: VisualDensity.compact),
                segments: const [
                  ButtonSegment(value: ThemeMode.system, label: Text('Auto')),
                  ButtonSegment(value: ThemeMode.light, icon: Icon(Icons.light_mode, size: 16)),
                  ButtonSegment(value: ThemeMode.dark, icon: Icon(Icons.dark_mode, size: 16)),
                ],
                selected: {mode},
                onSelectionChanged: (s) => ThemeController.instance.set(s.first),
              ),
            ),
          ],
        ),
      );

  Widget _linksCard() => _card(
        title: 'More',
        child: Column(
          children: [
            _link(Icons.payments_outlined, 'Earn — affiliate', () => _openWeb('/affiliate', 'Affiliate')),
            _link(Icons.storefront_outlined, 'Sell on DoyinMart', () => _openWeb('/vendor/dashboard', 'Vendor')),
            _link(Icons.description_outlined, 'Legal & policies', () => _openWeb('/legal', 'Legal')),
          ],
        ),
      );

  Widget _link(IconData icon, String label, VoidCallback onTap) => ListTile(
        contentPadding: EdgeInsets.zero,
        dense: true,
        leading: Icon(icon, size: 20),
        title: Text(label),
        trailing: const Icon(Icons.chevron_right, size: 18),
        onTap: onTap,
      );

  // --- Signed-out --------------------------------------------------------------

  Widget _buildSignedOut() {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        const SizedBox(height: 24),
        Center(child: _avatar('?')),
        const SizedBox(height: 16),
        const Center(
          child: Text('Welcome to DoyinMart', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18)),
        ),
        const SizedBox(height: 6),
        Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Text(
              'Sign in to see your purchases, license keys, gift cards and the stores you follow.',
              textAlign: TextAlign.center,
              style: TextStyle(color: context.brand.inkSoft),
            ),
          ),
        ),
        const SizedBox(height: 20),
        Center(
          child: ElevatedButton(
            onPressed: () async {
              final ok = await Navigator.push<bool>(
                  context, MaterialPageRoute(builder: (_) => const SignInScreen()));
              if (ok == true) _refresh();
            },
            child: const Text('Sign in or create an account'),
          ),
        ),
        const SizedBox(height: 28),
        _themeCard(),
        _linksCard(),
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
              // Centered profile header
              const SizedBox(height: 8),
              Center(child: _avatar(email)),
              const SizedBox(height: 12),
              Center(child: Text(email, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15))),
              const SizedBox(height: 2),
              Center(child: Text('Signed in', style: TextStyle(color: context.brand.inkSoft, fontSize: 12))),
              const SizedBox(height: 24),

              if (snap.connectionState == ConnectionState.waiting)
                const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator()))
              else if (snap.hasError)
                _card(title: 'Account', child: _muted('Couldn\'t load your account. Pull to refresh.'))
              else ...[
                _card(
                  title: 'Following',
                  child: snap.data!.following.isEmpty
                      ? _muted('You\'re not following any stores yet.')
                      : Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: snap.data!.following
                              .map((s) => ActionChip(
                                    avatar: CircleAvatar(
                                        backgroundColor: Brand.tintDark,
                                        child: Text(s.initials,
                                            style: TextStyle(fontSize: 10, color: context.brand.brand))),
                                    label: Text(s.name),
                                    onPressed: () => Navigator.push(context,
                                        MaterialPageRoute(builder: (_) => StoreScreen(slug: s.slug, name: s.name))),
                                  ))
                              .toList(),
                        ),
                ),
                _card(
                  title: 'Your gift cards',
                  child: snap.data!.giftCards.isEmpty
                      ? _muted('No gift cards yet.')
                      : Column(
                          children: snap.data!.giftCards
                              .map((g) => ListTile(
                                    contentPadding: EdgeInsets.zero,
                                    dense: true,
                                    title: Text(g.code,
                                        style: const TextStyle(fontFamily: 'monospace', fontSize: 12)),
                                    subtitle: Text(g.status, style: TextStyle(color: context.brand.inkSoft)),
                                    trailing: Text(naira(g.balanceMinor),
                                        style: const TextStyle(fontWeight: FontWeight.w700)),
                                  ))
                              .toList(),
                        ),
                ),
                _card(
                  title: 'Your purchases',
                  child: snap.data!.licenses.isEmpty
                      ? _muted('No purchases yet.')
                      : Column(
                          children: snap.data!.licenses
                              .map((l) => ListTile(
                                    contentPadding: EdgeInsets.zero,
                                    title: Text('${l.productName}  v${l.productVersion}',
                                        style: const TextStyle(fontWeight: FontWeight.w600)),
                                    subtitle: Text(l.key,
                                        style: TextStyle(fontSize: 11, color: context.brand.inkSoft)),
                                    trailing: TextButton(
                                      onPressed: () => launchUrl(Uri.parse(l.downloadUrl),
                                          mode: LaunchMode.externalApplication),
                                      child: const Text('Download'),
                                    ),
                                  ))
                              .toList(),
                        ),
                ),
              ],

              _linksCard(),
              _themeCard(),
              const SizedBox(height: 16),
            ],
          ),
        );
      },
    );
  }
}
