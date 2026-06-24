import 'package:flutter/material.dart';

import '../api.dart';
import '../screens/notifications_screen.dart';

/// Bell icon with an unread-count badge that opens the notifications inbox.
class NotificationBell extends StatefulWidget {
  const NotificationBell({super.key});
  @override
  State<NotificationBell> createState() => _NotificationBellState();
}

class _NotificationBellState extends State<NotificationBell> {
  int _unread = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final n = await Api.instance.unreadCount();
    if (mounted) setState(() => _unread = n);
  }

  @override
  Widget build(BuildContext context) {
    return IconButton(
      tooltip: 'Notifications',
      onPressed: () async {
        await Navigator.push(context, MaterialPageRoute(builder: (_) => const NotificationsScreen()));
        _load(); // refresh badge after viewing (inbox marks read)
      },
      icon: Stack(
        clipBehavior: Clip.none,
        children: [
          const Icon(Icons.notifications_none),
          if (_unread > 0)
            Positioned(
              right: -2,
              top: -2,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                constraints: const BoxConstraints(minWidth: 16),
                decoration: BoxDecoration(color: Colors.red, borderRadius: BorderRadius.circular(8)),
                child: Text(
                  _unread > 9 ? '9+' : '$_unread',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
