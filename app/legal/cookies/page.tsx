import type { Metadata } from "next";

export const metadata: Metadata = { title: "Cookie Policy — DoyinSoft" };

export default function CookiePage() {
  return (
    <>
      <h1>Cookie Policy</h1>
      <p className="updated">Last updated: 22 June 2026</p>

      <p>
        Cookies are small files stored on your device. DoyinSoft uses only the cookies needed to run
        the service — we do not use third-party advertising cookies.
      </p>

      <h2>Cookies we use</h2>
      <ul>
        <li>
          <strong>Authentication</strong> — keeps you signed in (set by our auth provider, Supabase).
          Essential.
        </li>
        <li>
          <strong>Referral</strong> — a <code>ref</code> cookie remembers the affiliate who referred
          you, for up to 30 days, so they are credited if you buy. Essential to the affiliate feature.
        </li>
      </ul>

      <h2>Managing cookies</h2>
      <p>
        You can clear or block cookies in your browser settings, but signing in and some features may
        stop working. Because we only use essential cookies, no separate consent banner is required for
        them.
      </p>

      <h2>Contact</h2>
      <p>
        <a href="mailto:privacy@doyinsoft.com">privacy@doyinsoft.com</a>.
      </p>

      <p style={{ marginTop: 24, fontSize: 11, color: "var(--text-tertiary)" }}>
        Starter template — not legal advice. Have a lawyer review before going live.
      </p>
    </>
  );
}
