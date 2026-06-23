import type { Metadata } from "next";

export const metadata: Metadata = { title: "Vendor Agreement — DoyinMart" };

export default function VendorAgreementPage() {
  return (
    <>
      <h1>Vendor Agreement</h1>
      <p className="updated">Last updated: 22 June 2026</p>

      <p>
        This Agreement governs your use of DoyinMart as a seller (&ldquo;Vendor&rdquo;). It applies in
        addition to our <a href="/legal/terms">Terms of Service</a>. By listing a product, you accept it.
      </p>

      <h2>1. Eligibility &amp; account</h2>
      <ul>
        <li>You must provide accurate business and payout details and keep them current.</li>
        <li>You are solely responsible for your listings, products, pricing, fulfilment and support.</li>
      </ul>

      <h2>2. Listings</h2>
      <ul>
        <li>Only list products you own or are authorised to sell.</li>
        <li>Descriptions, images, prices and availability must be accurate and not misleading.</li>
        <li>New and edited listings may be reviewed before going live; we may reject or unpublish any listing.</li>
      </ul>

      <h2>3. Fulfilment</h2>
      <ul>
        <li><strong>Digital:</strong> deliver a working download/licence as described.</li>
        <li><strong>Physical:</strong> ship promptly to the address provided and update the order status.</li>
        <li><strong>Services:</strong> deliver the agreed work and communicate with the buyer.</li>
      </ul>

      <h2>4. Fees &amp; payouts</h2>
      <ul>
        <li>DoyinMart charges a platform commission on each sale, deducted automatically.</li>
        <li>Your share is settled to your connected bank by our payment partner (Paystack) via split payments.</li>
        <li>You are responsible for your own taxes.</li>
      </ul>

      <h2>5. Refunds &amp; chargebacks</h2>
      <p>
        You agree to honour our <a href="/legal/refunds">Refund Policy</a>. Refunds and chargebacks may
        be deducted from your balance, and related commissions reversed.
      </p>

      <h2>6. Intellectual property</h2>
      <p>
        You retain ownership of your content and grant DoyinMart a licence to host, display and promote
        your listings on the platform. You must not infringe others&rsquo; rights.
      </p>

      <h2>7. Prohibited</h2>
      <p>
        No illegal, infringing, counterfeit, harmful or deceptive products; see our{" "}
        <a href="/legal/acceptable-use">Acceptable Use Policy</a>. Violations may lead to removal,
        withheld payouts, or suspension.
      </p>

      <h2>8. Suspension &amp; termination</h2>
      <p>
        We may suspend or terminate a Vendor account for breach, fraud, repeated complaints, or legal
        reasons. You may stop selling at any time; obligations for open orders survive.
      </p>

      <h2>9. Contact</h2>
      <p>
        <a href="mailto:vendors@doyinsoft.com">vendors@doyinsoft.com</a>.
      </p>

      <p style={{ marginTop: 24, fontSize: 11, color: "var(--text-tertiary)" }}>
        Starter template — not legal advice. Have a lawyer review before going live.
      </p>
    </>
  );
}
