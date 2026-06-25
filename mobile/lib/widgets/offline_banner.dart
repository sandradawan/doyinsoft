import 'dart:async';
import 'package:flutter/material.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

/// Wraps the app and shows a slim "No internet connection" bar when offline.
class OfflineBanner extends StatefulWidget {
  final Widget child;
  const OfflineBanner({super.key, required this.child});
  @override
  State<OfflineBanner> createState() => _OfflineBannerState();
}

class _OfflineBannerState extends State<OfflineBanner> {
  bool _offline = false;
  StreamSubscription<List<ConnectivityResult>>? _sub;

  @override
  void initState() {
    super.initState();
    Connectivity().checkConnectivity().then(_update);
    _sub = Connectivity().onConnectivityChanged.listen(_update);
  }

  void _update(List<ConnectivityResult> r) {
    final offline = r.isEmpty || r.every((e) => e == ConnectivityResult.none);
    if (mounted && offline != _offline) setState(() => _offline = offline);
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final topPad = MediaQuery.of(context).padding.top;
    return Column(
      children: [
        AnimatedContainer(
          duration: const Duration(milliseconds: 250),
          height: _offline ? 26 + topPad : 0,
          padding: EdgeInsets.only(top: _offline ? topPad : 0),
          color: const Color(0xFFB91C1C),
          alignment: Alignment.center,
          child: _offline
              ? const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.wifi_off, size: 13, color: Colors.white),
                    SizedBox(width: 6),
                    Text('No internet connection',
                        style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
                  ],
                )
              : null,
        ),
        Expanded(child: widget.child),
      ],
    );
  }
}
