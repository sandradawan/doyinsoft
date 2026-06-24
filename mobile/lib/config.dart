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

  // Supabase URL + ANON key are public by design (protected by Row Level
  // Security), exactly like the web app's NEXT_PUBLIC_* values — safe to ship in
  // the app. The service-role key is NEVER included here. Override per-env with
  // --dart-define if you point the app at a different project.
  static const supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://tljglirmrnsakgnsbhmg.supabase.co',
  );
  static const supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsamdsaXJtcm5zYWtnbnNiaG1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwMDM1NjksImV4cCI6MjA5NzU3OTU2OX0.x6kccw2jFhTKe40gCZ0PVROxdOmNZQO9EGUFI9oaeug',
  );

  static bool get supabaseConfigured =>
      supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty;
}
