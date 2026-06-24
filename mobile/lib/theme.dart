import 'package:flutter/material.dart';

/// DoyinMart design tokens — mirrors the web (emerald brand, light + dark).
class Brand {
  static const emerald = Color(0xFF04553E); // light brand
  static const emeraldHover = Color(0xFF033A2A);
  static const emeraldDark = Color(0xFF10B981); // dark-mode brand
  static const tintLight = Color(0xFFECFDF5);
  static const tintDark = Color(0xFF0C2A20);
}

ThemeData buildTheme(Brightness brightness) {
  final dark = brightness == Brightness.dark;
  final brand = dark ? Brand.emeraldDark : Brand.emerald;
  final bg = dark ? const Color(0xFF0B0B0C) : Colors.white;
  final surface = dark ? const Color(0xFF18181B) : const Color(0xFFF5F5F4);
  final ink = dark ? const Color(0xFFFAFAFA) : const Color(0xFF171717);
  final inkSoft = dark ? const Color(0xFFA1A1AA) : const Color(0xFF737373);
  final line = dark ? const Color(0xFF262629) : const Color(0xFFCFCFCF);

  final base = ThemeData(brightness: brightness, useMaterial3: true);
  return base.copyWith(
    scaffoldBackgroundColor: bg,
    colorScheme: ColorScheme.fromSeed(
      seedColor: brand,
      brightness: brightness,
    ).copyWith(primary: brand, surface: bg, onSurface: ink),
    textTheme: base.textTheme.apply(bodyColor: ink, displayColor: ink),
    appBarTheme: AppBarTheme(
      backgroundColor: bg,
      foregroundColor: ink,
      elevation: 0,
      scrolledUnderElevation: 0.5,
      centerTitle: false,
    ),
    cardColor: surface,
    dividerColor: line,
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: bg,
      hintStyle: TextStyle(color: inkSoft),
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(color: line),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(color: brand, width: 1.5),
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: brand,
        foregroundColor: Colors.white,
        elevation: 0,
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 18),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
      ),
    ),
    bottomNavigationBarTheme: BottomNavigationBarThemeData(
      backgroundColor: bg,
      selectedItemColor: brand,
      unselectedItemColor: inkSoft,
      type: BottomNavigationBarType.fixed,
      showUnselectedLabels: true,
    ),
    extensions: [BrandColors(brand: brand, inkSoft: inkSoft, line: line, surface: surface)],
  );
}

/// Extra tokens not covered by ColorScheme.
class BrandColors extends ThemeExtension<BrandColors> {
  final Color brand;
  final Color inkSoft;
  final Color line;
  final Color surface;
  const BrandColors({required this.brand, required this.inkSoft, required this.line, required this.surface});

  @override
  BrandColors copyWith({Color? brand, Color? inkSoft, Color? line, Color? surface}) => BrandColors(
        brand: brand ?? this.brand,
        inkSoft: inkSoft ?? this.inkSoft,
        line: line ?? this.line,
        surface: surface ?? this.surface,
      );

  @override
  BrandColors lerp(BrandColors? other, double t) => other ?? this;
}

extension BrandContext on BuildContext {
  BrandColors get brand => Theme.of(this).extension<BrandColors>()!;
}
