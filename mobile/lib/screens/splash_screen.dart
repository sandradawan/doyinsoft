import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';

import '../root_shell.dart';

const _emerald = Color(0xFF04553E);
const _emeraldDeep = Color(0xFF022C22);

// Market / commerce icons that orbit the logo.
const _orbitIcons = [
  Icons.storefront,
  Icons.shopping_cart_outlined,
  Icons.card_giftcard,
  Icons.local_offer_outlined,
  Icons.inventory_2_outlined,
  Icons.payments_outlined,
  Icons.sell_outlined,
  Icons.redeem,
];

/// Branded animated splash: a spinning ring of market icons around the DoyinMart
/// mark, with the wordmark fading in. Shows for ~6s, then fades into the app.
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});
  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with TickerProviderStateMixin {
  late final AnimationController _orbit; // continuous rotation
  late final AnimationController _intro; // fade/scale in
  late final Animation<double> _logoScale;
  late final Animation<double> _fade;

  @override
  void initState() {
    super.initState();
    _orbit = AnimationController(vsync: this, duration: const Duration(seconds: 6))..repeat();
    _intro = AnimationController(vsync: this, duration: const Duration(milliseconds: 1000))..forward();
    _logoScale = Tween(begin: 0.6, end: 1.0)
        .animate(CurvedAnimation(parent: _intro, curve: Curves.easeOutBack));
    _fade = CurvedAnimation(parent: _intro, curve: const Interval(0.4, 1.0, curve: Curves.easeOut));

    // Hold the splash for 6 seconds, then transition to the app.
    Timer(const Duration(seconds: 6), () {
      if (!mounted) return;
      Navigator.of(context).pushReplacement(PageRouteBuilder(
        transitionDuration: const Duration(milliseconds: 550),
        pageBuilder: (_, __, ___) => const RootShell(),
        transitionsBuilder: (_, anim, __, child) => FadeTransition(opacity: anim, child: child),
      ));
    });
  }

  @override
  void dispose() {
    _orbit.dispose();
    _intro.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    const ringRadius = 96.0;
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: RadialGradient(center: Alignment.center, radius: 1.0, colors: [_emerald, _emeraldDeep]),
        ),
        child: Stack(
          children: [
            Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SizedBox(
                    width: 260,
                    height: 260,
                    child: AnimatedBuilder(
                      animation: Listenable.merge([_orbit, _intro]),
                      builder: (context, _) {
                        final base = _orbit.value * 2 * math.pi;
                        return Stack(
                          alignment: Alignment.center,
                          children: [
                            // faint orbit guide ring
                            Opacity(
                              opacity: 0.12 * _intro.value,
                              child: Container(
                                width: ringRadius * 2,
                                height: ringRadius * 2,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  border: Border.all(color: Colors.white, width: 1),
                                ),
                              ),
                            ),
                            // orbiting market icons (kept upright)
                            for (int i = 0; i < _orbitIcons.length; i++)
                              Transform.translate(
                                offset: Offset(
                                  ringRadius * math.cos(base + i * 2 * math.pi / _orbitIcons.length),
                                  ringRadius * math.sin(base + i * 2 * math.pi / _orbitIcons.length),
                                ),
                                child: Opacity(
                                  opacity: _intro.value,
                                  child: Container(
                                    width: 40,
                                    height: 40,
                                    decoration: BoxDecoration(
                                      color: Colors.white.withValues(alpha: 0.14),
                                      shape: BoxShape.circle,
                                    ),
                                    child: Icon(_orbitIcons[i], color: Colors.white, size: 20),
                                  ),
                                ),
                              ),
                            // center logo (gentle counter-spin so it feels alive)
                            ScaleTransition(
                              scale: _logoScale,
                              child: Transform.rotate(
                                angle: -base * 0.15,
                                child: Container(
                                  width: 96,
                                  height: 96,
                                  decoration: BoxDecoration(
                                    color: Colors.white.withValues(alpha: 0.08),
                                    shape: BoxShape.circle,
                                  ),
                                  padding: const EdgeInsets.all(14),
                                  child: Image.asset('assets/splash.png'),
                                ),
                              ),
                            ),
                          ],
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 26),
                  FadeTransition(
                    opacity: _fade,
                    child: const Column(
                      children: [
                        Text('DoyinMart',
                            style: TextStyle(
                                color: Colors.white, fontSize: 30, fontWeight: FontWeight.w700, letterSpacing: -0.5)),
                        SizedBox(height: 6),
                        Text('A marketplace built for African markets',
                            style: TextStyle(color: Colors.white70, fontSize: 13)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Positioned(
              left: 0,
              right: 0,
              bottom: 44,
              child: FadeTransition(
                opacity: _fade,
                child: const Center(
                  child: SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation(Colors.white60)),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
