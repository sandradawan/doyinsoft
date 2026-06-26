import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'config.dart';
import 'theme.dart';
import 'theme_controller.dart';
import 'push_service.dart';
import 'notification_router.dart';
import 'screens/splash_screen.dart';
import 'widgets/offline_banner.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Never show a raw black/grey crash box — render a friendly message instead.
  ErrorWidget.builder = (FlutterErrorDetails details) => Material(
        color: const Color(0xFF0B1220),
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.error_outline, color: Colors.white70, size: 36),
                const SizedBox(height: 12),
                const Text('Something went wrong on this screen.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                const SizedBox(height: 6),
                Text('Go back and try again.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.white.withValues(alpha: 0.6), fontSize: 13)),
              ],
            ),
          ),
        ),
      );

  await ThemeController.instance.load();
  if (Config.supabaseConfigured) {
    await Supabase.initialize(url: Config.supabaseUrl, anonKey: Config.supabaseAnonKey);
    await PushService.init();
    // Register now if already signed in, and react to future sign-in/out.
    if (Supabase.instance.client.auth.currentSession != null) {
      PushService.registerForUser();
    }
    Supabase.instance.client.auth.onAuthStateChange.listen((data) {
      switch (data.event) {
        case AuthChangeEvent.signedIn:
        case AuthChangeEvent.tokenRefreshed:
          PushService.registerForUser();
          break;
        case AuthChangeEvent.signedOut:
          PushService.unregister();
          break;
        default:
          break;
      }
    });
  }
  runApp(const DoyinMartApp());
}

class DoyinMartApp extends StatelessWidget {
  const DoyinMartApp({super.key});
  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<ThemeMode>(
      valueListenable: ThemeController.instance,
      builder: (context, mode, _) => MaterialApp(
        title: 'DoyinMart',
        navigatorKey: NotificationRouter.navigatorKey,
        debugShowCheckedModeBanner: false,
        theme: buildTheme(Brightness.light),
        darkTheme: buildTheme(Brightness.dark),
        themeMode: mode,
        builder: (context, child) => OfflineBanner(child: child ?? const SizedBox.shrink()),
        home: const SplashScreen(),
      ),
    );
  }
}
