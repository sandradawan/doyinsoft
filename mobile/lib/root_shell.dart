import 'package:flutter/material.dart';

import 'notification_router.dart';
import 'screens/home_screen.dart';
import 'screens/stores_screen.dart';
import 'screens/gift_cards_screen.dart';
import 'screens/account_screen.dart';

class RootShell extends StatefulWidget {
  const RootShell({super.key});
  @override
  State<RootShell> createState() => _RootShellState();
}

class _RootShellState extends State<RootShell> {
  int _tab = 0;
  final _screens = const [HomeScreen(), StoresScreen(), GiftCardsScreen(), AccountScreen()];

  @override
  void initState() {
    super.initState();
    // Handle a tap that cold-started the app, once the navigator is mounted.
    WidgetsBinding.instance.addPostFrameCallback((_) => NotificationRouter.consumePending());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: _tab, children: _screens),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tab,
        onDestinationSelected: (i) => setState(() => _tab = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.storefront_outlined), selectedIcon: Icon(Icons.storefront), label: 'Shop'),
          NavigationDestination(icon: Icon(Icons.store_outlined), selectedIcon: Icon(Icons.store), label: 'Stores'),
          NavigationDestination(icon: Icon(Icons.card_giftcard_outlined), selectedIcon: Icon(Icons.card_giftcard), label: 'Gift cards'),
          NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Account'),
        ],
      ),
    );
  }
}
