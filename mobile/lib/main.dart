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
