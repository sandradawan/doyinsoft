import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../api.dart';
import '../config.dart';
import '../models.dart';
import '../theme.dart';
import 'sign_in_screen.dart';

class AccountScreen extends StatefulWidget {
  const AccountScreen({super.key});
  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen> {
  Future<({List<License> licenses, List<GiftCard> giftCards})>? _future;

  bool get _signedIn =>
      Config.supabaseConfigured && Supabase.instance.client.auth.currentSession != null;

  @override
  void initState() {
    super.initState();
    if (_signedIn) _future = Api.instance.me();
  }

  void _refresh() => setState(() => _future = _signedIn ? Api.instance.me() : null);

  @override
  Widget build(BuildContext context) {
    if (!_signedIn) {
      return Scaffold(
        appBar: AppBar(title: const Text('Account')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.person_outline, size: 40),
                const SizedBox(height: 12),
                const Text('Sign in to see your purchases, license keys and gift cards.',
                    textAlign: TextAlign.center),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () async {
                    final ok = await Navigator.push<bool>(
                        context, MaterialPageRoute(builder: (_) => const SignInScreen()));
                    if (ok == true) _refresh();
                  },
                  child: const Text('Sign in'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final email = Supabase.instance.client.auth.currentUser?.email ?? '';
    return Scaffold(
      appBar: AppBar(
        title: const Text('Account'),
        actions: [
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
      body: FutureBuilder<({List<License> licenses, List<GiftCard> giftCards})>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snap.hasError) {
            return Center(child: Text('Couldn\'t load your account.\n${snap.error}', textAlign: TextAlign.center));
          }
          final data = snap.data!;
          return RefreshIndicator(
            onRefresh: () async => _refresh(),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Text(email, style: TextStyle(color: context.brand.inkSoft)),
                const SizedBox(height: 20),
                if (data.giftCards.isNotEmpty) ...[
                  const Text('Your gift cards', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
                  const SizedBox(height: 8),
                  ...data.giftCards.map((g) => ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(g.code, style: const TextStyle(fontFamily: 'monospace', fontSize: 13)),
                        trailing: Text(naira(g.balanceMinor),
                            style: const TextStyle(fontWeight: FontWeight.w700)),
                        subtitle: Text(g.status, style: TextStyle(color: context.brand.inkSoft)),
                      )),
                  const SizedBox(height: 20),
                ],
                const Text('Your purchases', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
                const SizedBox(height: 8),
                if (data.licenses.isEmpty)
                  Text('No purchases yet.', style: TextStyle(color: context.brand.inkSoft))
                else
                  ...data.licenses.map((l) => ListTile(
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
                      )),
              ],
            ),
          );
        },
      ),
    );
  }
}
