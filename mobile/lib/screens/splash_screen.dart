import 'dart:async';
import 'package:flutter/material.dart';

import '../root_shell.dart';

const _emerald = Color(0xFF04553E);

/// Branded animated splash shown over the native splash → fades into the app.
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});
  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with SingleTickerProviderStateMixin {
  late final AnimationController _c;
  late final Animation<double> _logoFade;
  late final Animation<double> _logoScale;
  late final Animation<double> _textFade;

  @override
  void initState() {
    super.initState();
    _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 1100))..forward();
    _logoFade = CurvedAnimation(parent: _c, curve: const Interval(0.0, 0.5, curve: Curves.easeOut));
    _logoScale = Tween(begin: 0.82, end: 1.0)
        .animate(CurvedAnimation(parent: _c, curve: const Interval(0.0, 0.6, curve: Curves.easeOutBack)));
    _textFade = CurvedAnimation(parent: _c, curve: const Interval(0.4, 1.0, curve: Curves.easeOut));

    Timer(const Duration(milliseconds: 1900), () {
      if (!mounted) return;
      Navigator.of(context).pushReplacement(PageRouteBuilder(
        transitionDuration: const Duration(milliseconds: 450),
        pageBuilder: (_, __, ___) => const RootShell(),
        transitionsBuilder: (_, anim, __, child) => FadeTransition(opacity: anim, child: child),
      ));
    });
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _emerald,
      body: Stack(
        children: [
          Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                FadeTransition(
                  opacity: _logoFade,
                  child: ScaleTransition(
                    scale: _logoScale,
                    child: Image.asset('assets/splash.png', width: 104, height: 104),
                  ),
                ),
                const SizedBox(height: 18),
                FadeTransition(
                  opacity: _textFade,
                  child: const Column(
                    children: [
                      Text('DoyinMart',
                          style: TextStyle(
                              color: Colors.white, fontSize: 26, fontWeight: FontWeight.w700, letterSpacing: -0.5)),
                      SizedBox(height: 4),
                      Text('A marketplace built for African markets',
                          style: TextStyle(color: Colors.white70, fontSize: 12.5)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const Positioned(
            left: 0,
            right: 0,
            bottom: 48,
            child: Center(
              child: SizedBox(
                width: 22,
                height: 22,
                child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation(Colors.white70)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
