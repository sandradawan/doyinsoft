import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../theme.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});
  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _name = TextEditingController();
  final _phone = TextEditingController();
  bool _busy = false;
  String? _msg;

  @override
  void initState() {
    super.initState();
    final meta = Supabase.instance.client.auth.currentUser?.userMetadata ?? {};
    _name.text = (meta['display_name'] as String?) ?? '';
    _phone.text = (meta['phone'] as String?) ?? '';
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() {
      _busy = true;
      _msg = null;
    });
    try {
      await Supabase.instance.client.auth.updateUser(
        UserAttributes(data: {'display_name': _name.text.trim(), 'phone': _phone.text.trim()}),
      );
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      setState(() => _msg = '$e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final email = Supabase.instance.client.auth.currentUser?.email ?? '';
    final seed = _name.text.isNotEmpty ? _name.text : email;
    return Scaffold(
      appBar: AppBar(title: const Text('Edit profile')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const SizedBox(height: 8),
          Center(
            child: CircleAvatar(
              radius: 40,
              backgroundColor: Brand.tintDark,
              child: Text((seed.isNotEmpty ? seed[0] : '?').toUpperCase(),
                  style: TextStyle(color: context.brand.brand, fontWeight: FontWeight.w700, fontSize: 28)),
            ),
          ),
          const SizedBox(height: 24),
          if (_msg != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text(_msg!, style: const TextStyle(color: Colors.redAccent, fontSize: 13)),
            ),
          const Text('Display name', style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          TextField(controller: _name, decoration: const InputDecoration(hintText: 'e.g. Sandra Dawan')),
          const SizedBox(height: 16),
          const Text('Phone (WhatsApp)', style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          TextField(
            controller: _phone,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(hintText: 'Optional'),
          ),
          const SizedBox(height: 16),
          const Text('Email', style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          TextField(
            enabled: false,
            controller: TextEditingController(text: email),
            decoration: const InputDecoration(),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: _busy ? null : _save,
            child: Text(_busy ? 'Saving…' : 'Save profile'),
          ),
        ],
      ),
    );
  }
}
