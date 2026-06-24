import 'package:flutter/material.dart';

import '../api.dart';
import '../theme.dart';
import 'checkout_webview.dart';

class GiftCardsScreen extends StatefulWidget {
  const GiftCardsScreen({super.key});
  @override
  State<GiftCardsScreen> createState() => _GiftCardsScreenState();
}

class _GiftCardsScreenState extends State<GiftCardsScreen> {
  final _codeCtrl = TextEditingController();
  String? _result;
  bool _ok = false;
  bool _checking = false;

  Future<void> _check() async {
    final code = _codeCtrl.text.trim();
    if (code.isEmpty) return;
    setState(() => _checking = true);
    try {
      final res = await Api.instance.giftBalance(code);
      setState(() {
        _ok = res.ok;
        _result = res.message;
      });
    } catch (e) {
      setState(() {
        _ok = false;
        _result = 'Could not check that code.';
      });
    } finally {
      setState(() => _checking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Gift cards')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFF0B5E46), Color(0xFF022C22)],
              ),
            ),
            child: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('DoyinMart', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 16)),
                SizedBox(height: 24),
                Text('GIFT CARD',
                    style: TextStyle(color: Colors.white70, letterSpacing: 2, fontSize: 11)),
                SizedBox(height: 2),
                Text('Give the gift of choice',
                    style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w600)),
              ],
            ),
          ),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            icon: const Icon(Icons.card_giftcard),
            label: const Text('Buy a gift card'),
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const CheckoutWebView(path: '/gift-cards', title: 'Buy gift card')),
            ),
          ),
          const SizedBox(height: 28),
          const Text('Check a balance', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
          const SizedBox(height: 8),
          Row(children: [
            Expanded(
              child: TextField(
                controller: _codeCtrl,
                decoration: const InputDecoration(hintText: 'GIFT-XXXX-XXXX-XXXX-XXXX'),
                textCapitalization: TextCapitalization.characters,
              ),
            ),
            const SizedBox(width: 8),
            OutlinedButton(onPressed: _checking ? null : _check, child: const Text('Check')),
          ]),
          if (_result != null)
            Padding(
              padding: const EdgeInsets.only(top: 10),
              child: Text(_result!, style: TextStyle(color: _ok ? Colors.green : context.brand.inkSoft)),
            ),
        ],
      ),
    );
  }
}
