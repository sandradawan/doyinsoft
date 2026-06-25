import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:package_info_plus/package_info_plus.dart';

import '../api.dart';
import '../theme.dart';
import '../theme_controller.dart';
import 'profile_screen.dart';
import 'checkout_webview.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});
  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _notif = true;
  String _version = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final info = await PackageInfo.fromPlatform();
    if (mounted) {
      setState(() {
        _notif = prefs.getBool('notif_enabled') ?? true;
        _version = '${info.version} (${info.buildNumber})';
      });
    }
  }

  Future<void> _setNotif(bool v) async {
    setState(() => _notif = v);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('notif_enabled', v);
  }

  void _web(String path, String title) => Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => CheckoutWebView(path: path, title: title)),
      );

  Future<void> _signOut() async {
    await Supabase.instance.client.auth.signOut();
    if (mounted) Navigator.pop(context, true);
  }

  Future<void> _deleteAccount() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Delete account?'),
        content: const Text(
            'This permanently deletes your account and data. Purchased license keys and gift cards remain valid by their code. This can’t be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await Api.instance.deleteAccount();
      await Supabase.instance.client.auth.signOut();
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('$e'.replaceFirst('Exception: ', ''))));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final email = Supabase.instance.client.auth.currentUser?.email ?? '';
    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        children: [
          _header('Account'),
          if (email.isNotEmpty)
            ListTile(leading: const Icon(Icons.mail_outline), title: Text(email), dense: true),
          _tile(Icons.person_outline, 'Edit profile', () async {
            await Navigator.push(context, MaterialPageRoute(builder: (_) => const ProfileScreen()));
          }),

          _header('Preferences'),
          ListTile(
            leading: const Icon(Icons.brightness_6_outlined),
            title: const Text('Theme'),
            trailing: ValueListenableBuilder<ThemeMode>(
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
          ),
          SwitchListTile(
            secondary: const Icon(Icons.notifications_outlined),
            title: const Text('Order & gift alerts'),
            subtitle: const Text('Show in-app notifications'),
            value: _notif,
            onChanged: _setNotif,
          ),

          _header('About'),
          _tile(Icons.description_outlined, 'Terms & privacy', () => _web('/legal', 'Legal')),
          _tile(Icons.help_outline, 'Help & support', () => _web('/legal', 'Support')),
          ListTile(
            leading: const Icon(Icons.info_outline),
            title: const Text('Version'),
            trailing: Text(_version, style: TextStyle(color: context.brand.inkSoft)),
            dense: true,
          ),

          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: OutlinedButton.icon(
              onPressed: _signOut,
              icon: const Icon(Icons.logout, size: 18),
              label: const Text('Sign out'),
              style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(46)),
            ),
          ),
          const SizedBox(height: 8),
          Center(
            child: TextButton(
              onPressed: _deleteAccount,
              child: const Text('Delete account', style: TextStyle(color: Colors.red, fontSize: 13)),
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _header(String t) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 18, 16, 6),
        child: Text(t.toUpperCase(),
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.5, color: context.brand.inkSoft)),
      );

  Widget _tile(IconData icon, String label, VoidCallback onTap) => ListTile(
        leading: Icon(icon),
        title: Text(label),
        trailing: const Icon(Icons.chevron_right, size: 18),
        onTap: onTap,
      );
}
