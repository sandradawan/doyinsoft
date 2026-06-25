import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../root_shell.dart';
import '../theme.dart';

const onboardedKey = 'onboarded_v1';

class _Slide {
  final IconData icon;
  final String title;
  final String body;
  const _Slide(this.icon, this.title, this.body);
}

const _slides = [
  _Slide(Icons.storefront_outlined, 'Shop African markets',
      'Software, digital products, fashion and more from independent sellers — all in one place.'),
  _Slide(Icons.card_giftcard_outlined, 'Gift cards in ₦ or \$',
      'Buy and send DoyinMart gift cards in Naira or Dollars. Redeem them at checkout across any store.'),
  _Slide(Icons.favorite_outline, 'Save, follow & stay in the loop',
      'Wishlist products, follow your favourite stores, and get instant alerts on orders and gifts.'),
];

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});
  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _controller = PageController();
  int _page = 0;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _finish() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(onboardedKey, true);
    if (mounted) {
      Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const RootShell()));
    }
  }

  void _next() {
    if (_page < _slides.length - 1) {
      _controller.nextPage(duration: const Duration(milliseconds: 300), curve: Curves.easeOut);
    } else {
      _finish();
    }
  }

  @override
  Widget build(BuildContext context) {
    final brand = context.brand;
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(onPressed: _finish, child: const Text('Skip')),
            ),
            Expanded(
              child: PageView.builder(
                controller: _controller,
                onPageChanged: (i) => setState(() => _page = i),
                itemCount: _slides.length,
                itemBuilder: (context, i) {
                  final s = _slides[i];
                  return Padding(
                    padding: const EdgeInsets.all(32),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          width: 120,
                          height: 120,
                          decoration: const BoxDecoration(color: Brand.tintDark, shape: BoxShape.circle),
                          child: Icon(s.icon, size: 56, color: brand.brand),
                        ),
                        const SizedBox(height: 36),
                        Text(s.title,
                            textAlign: TextAlign.center,
                            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w700)),
                        const SizedBox(height: 12),
                        Text(s.body,
                            textAlign: TextAlign.center,
                            style: TextStyle(fontSize: 15, height: 1.5, color: brand.inkSoft)),
                      ],
                    ),
                  );
                },
              ),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(_slides.length, (i) {
                final active = i == _page;
                return AnimatedContainer(
                  duration: const Duration(milliseconds: 250),
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  width: active ? 20 : 7,
                  height: 7,
                  decoration: BoxDecoration(
                    color: active ? brand.brand : brand.line,
                    borderRadius: BorderRadius.circular(4),
                  ),
                );
              }),
            ),
            Padding(
              padding: const EdgeInsets.all(24),
              child: ElevatedButton(
                onPressed: _next,
                style: ElevatedButton.styleFrom(minimumSize: const Size.fromHeight(52)),
                child: Text(_page == _slides.length - 1 ? 'Get started' : 'Next'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
