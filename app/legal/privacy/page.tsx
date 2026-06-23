import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy — DoyinMart" };

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="updated">Last updated: 22 June 2026</p>

      <p>
        This policy explains what we collect, why, and your rights. It applies to DoyinMart and is
        aligned with the Nigeria Data Protection Act.
      </p>

      <h2>1. What we collect</h2>
      <ul>
        <li><strong>Account:</strong> name, email, password (hashed), and — for vendors — business name, bank/payout details and WhatsApp number.</li>
        <li><strong>Transactions:</strong> orders, licences, amounts, and a payment reference from our processor.</li>
        <li><strong>Content:</strong> products, reviews and messages you submit.</li>
        <li><strong>Technical:</strong> basic logs and cookies needed to run the site (e.g. your session and a referral cookie).</li>
      </ul>

      <h2>2. How we use it</h2>
      <ul>
        <li>To operate the marketplace — accounts, listings, checkout, licences and downloads.</li>
        <li>To process payments and pay vendors and affiliates.</li>
        <li>To send transactional email (receipts, licence keys, approval notices).</li>
        <li>To prevent fraud and abuse, and to comply with the law.</li>
      </ul>

      <h2>3. Processors we use</h2>
      <ul>
        <li><strong>Supabase</strong> — database, authentication and file storage.</li>
        <li><strong>Paystack</strong> — payment processing and payouts.</li>
        <li><strong>Resend</strong> — transactional email delivery.</li>
        <li><strong>Vercel</strong> — hosting.</li>
      </ul>
      <p>These providers process data on our behalf under their own security and privacy terms.</p>

      <h2>4. Sharing</h2>
      <p>
        We do not sell your personal data. We share only what is necessary with the processors above,
        with a Vendor to fulfil your order, or where required by law.
      </p>

      <h2>5. Cookies</h2>
      <p>
        We use essential cookies for sign-in sessions and to remember a referral link for 30 days.
        We do not use third-party advertising cookies.
      </p>

      <h2>6. Retention</h2>
      <p>
        We keep data while your account is active and as needed for legal, tax and accounting
        purposes, then delete or anonymise it.
      </p>

      <h2>7. Your rights</h2>
      <p>
        You may access, correct, export or delete your data, and object to certain processing. Email{" "}
        <a href="mailto:privacy@doyinsoft.com">privacy@doyinsoft.com</a> and we will respond within a
        reasonable time.
      </p>

      <h2>8. Security</h2>
      <p>
        We use encryption in transit, row-level security on our database, and least-privilege access.
        No system is perfectly secure, but we take reasonable measures to protect your data.
      </p>

      <h2>9. Contact</h2>
      <p>
        Privacy questions: <a href="mailto:privacy@doyinsoft.com">privacy@doyinsoft.com</a>.
      </p>

      <p style={{ marginTop: 24, fontSize: 11, color: "var(--text-tertiary)" }}>
        This is a starter template and not legal advice. Have a qualified lawyer review it before
        going live.
      </p>
    </>
  );
}
