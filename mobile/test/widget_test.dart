import 'package:flutter_test/flutter_test.dart';
import 'package:doyinmart/main.dart';

void main() {
  testWidgets('App builds with the bottom nav', (WidgetTester tester) async {
    await tester.pumpWidget(const DoyinMartApp());
    expect(find.text('Shop'), findsOneWidget);
    expect(find.text('Gift cards'), findsOneWidget);
  });
}
