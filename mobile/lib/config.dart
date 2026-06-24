/// App configuration. Pass real values at build/run time with --dart-define, e.g.
///   flutter run \
///     --dart-define=API_BASE=https://doyinsoft.vercel.app \
///     --dart-define=SUPABASE_URL=https://xxxx.supabase.co \
///     --dart-define=SUPABASE_ANON_KEY=eyJ...
class Config {
  /// Base URL of the Next.js backend (REST API + WebView checkout). No trailing slash.
  static const apiBase = String.fromEnvironment(
    'API_BASE',
    defaultValue: 'https://doyinsoft.vercel.app',
  );

  static const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  static const supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');

  static bool get supabaseConfigured =>
      supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty;
}
