import type { Metadata } from "next";

export const metadata: Metadata = { title: "Acceptable Use Policy — DoyinMart" };

export default function AcceptableUsePage() {
  return (
    <>
      <h1>Acceptable Use Policy</h1>
      <p className="updated">Last updated: 22 June 2026</p>

      <p>
        To keep DoyinMart safe and trustworthy, the following are not allowed. This applies to all
        users, listings, reviews and messages.
      </p>

      <h2>Prohibited products &amp; content</h2>
      <ul>
        <li>Illegal goods or services, or anything that breaches Nigerian law.</li>
        <li>Counterfeit, pirated, or infringing software, media or goods.</li>
        <li>Malware, spyware, cracking tools, or anything designed to harm devices or data.</li>
        <li>Stolen accounts, credentials, payment data, or personal data.</li>
        <li>Weapons, regulated substances, and other restricted items.</li>
        <li>Hateful, harassing, sexual-exploitative, or violent content.</li>
        <li>Misleading, deceptive, or fraudulent listings and claims.</li>
      </ul>

      <h2>Prohibited behaviour</h2>
      <ul>
        <li>Fraud, money-laundering, or abusive chargebacks.</li>
        <li>Fake reviews, vote manipulation, or spam.</li>
        <li>Circumventing fees or taking transactions off-platform to avoid protections.</li>
        <li>Scraping, hacking, overloading, or probing the platform&rsquo;s security.</li>
        <li>Impersonation or misrepresenting your identity or affiliation.</li>
      </ul>

      <h2>Enforcement</h2>
      <p>
        We may remove content, withhold payouts, suspend or ban accounts, and report unlawful activity
        to the authorities. Report violations to{" "}
        <a href="mailto:abuse@doyinsoft.com">abuse@doyinsoft.com</a>.
      </p>

      <p style={{ marginTop: 24, fontSize: 11, color: "var(--text-tertiary)" }}>
        Starter template — not legal advice. Have a lawyer review before going live.
      </p>
    </>
  );
}
