import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../config.dart';

/// Opens a hardened web flow (checkout or gift-card purchase) in a WebView so the
/// app never re-implements money logic. Paystack runs inside the same WebView and
/// returns to the success page; we detect that and let the user close.
class CheckoutWebView extends StatefulWidget {
  final String path; // e.g. /checkout/new?product=slug  or  /gift-cards
  final String title;
  const CheckoutWebView({super.key, required this.path, this.title = 'Checkout'});

  @override
  State<CheckoutWebView> createState() => _CheckoutWebViewState();
}

class _CheckoutWebViewState extends State<CheckoutWebView> {
  late final WebViewController _controller;
  bool _loading = true;
  bool _done = false;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(NavigationDelegate(
        onPageStarted: (_) => setState(() => _loading = true),
        onPageFinished: (url) {
          setState(() {
            _loading = false;
            if (url.contains('/success') || url.contains('done=1')) _done = true;
          });
        },
      ))
      ..loadRequest(Uri.parse('${Config.apiBase}${widget.path}'));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_done ? 'Done' : widget.title),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(_done),
            child: Text(_done ? 'Close' : 'Cancel'),
          ),
        ],
      ),
      body: Stack(
        children: [
          WebViewWidget(controller: _controller),
          if (_loading) const LinearProgressIndicator(minHeight: 2),
        ],
      ),
    );
  }
}
