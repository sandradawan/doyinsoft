import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Service — DoyinMart" };

export default function TermsPage() {
  return (
    <>
      <h1>Terms of Service</h1>
      <p className="updated">Last updated: 22 June 2026</p>

      <p>
        Welcome to DoyinMart (&ldquo;DoyinMart&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;). DoyinMart is an
        online marketplace that connects independent sellers (&ldquo;Vendors&rdquo;) with buyers
        (&ldquo;Buyers&rdquo;) of software, digital products, physical goods and services. By accessing or
        using DoyinMart you agree to these Terms. If you do not agree, do not use the platform.
      </p>

      <h2>1. Accounts</h2>
      <ul>
        <li>You must provide accurate information and keep your account secure.</li>
        <li>You are responsible for all activity under your account.</li>
        <li>You must be at least 18, or have the consent of a parent or guardian.</li>
      </ul>

      <h2>2. The role of DoyinMart</h2>
      <p>
        DoyinMart is a venue. Vendors — not DoyinMart — are responsible for their listings, products,
        fulfilment, support and compliance with the law. We do not manufacture, own, inspect or
        guarantee any product listed, except where expressly stated.
      </p>

      <h2>3. Vendors</h2>
      <ul>
        <li>You may only list products you have the right to sell.</li>
        <li>Listings must be accurate and not misleading. Prohibited, illegal, infringing, or harmful items are not allowed.</li>
        <li>You must deliver what you sell — digital downloads/license keys, or shipment/performance of physical goods and services.</li>
        <li>DoyinMart deducts a platform commission from each sale; the remainder is settled to your connected bank by our payment partner.</li>
        <li>We may review, reject, unpublish or remove listings, and suspend vendors who violate these Terms.</li>
      </ul>

      <h2>4. Buyers</h2>
      <ul>
        <li>Prices are shown at checkout. Payments are processed by our payment partner (Paystack).</li>
        <li>For software/digital goods you receive a licence and/or download as described on the listing.</li>
        <li>For physical goods and services, fulfilment is provided by the Vendor.</li>
      </ul>

      <h2>5. Payments</h2>
      <p>
        Payments are processed by Paystack. By purchasing, you authorise the charge and agree to
        Paystack&rsquo;s terms. We are not responsible for issues arising from the payment processor, but
        we will assist where we reasonably can.
      </p>

      <h2>6. Licences &amp; intellectual property</h2>
      <p>
        Software and digital products are licensed, not sold, on the terms set by the Vendor. You may
        not resell, redistribute or share licence keys or downloads unless the Vendor permits it.
      </p>

      <h2>7. Refunds</h2>
      <p>
        Refunds are governed by our <a href="/legal/refunds">Refund Policy</a>.
      </p>

      <h2>8. Prohibited conduct</h2>
      <p>
        No fraud, malware, infringement, harassment, scraping, or attempts to disrupt the platform.
        We may remove content and suspend accounts that breach these Terms.
      </p>

      <h2>9. Disclaimers &amp; liability</h2>
      <p>
        The platform is provided &ldquo;as is&rdquo;. To the maximum extent permitted by law, DoyinMart is not
        liable for indirect or consequential losses, or for the acts or omissions of Vendors or
        Buyers. Nothing in these Terms excludes liability that cannot be excluded by law.
      </p>

      <h2>10. Changes &amp; governing law</h2>
      <p>
        We may update these Terms; continued use means you accept the changes. These Terms are
        governed by the laws of the Federal Republic of Nigeria.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions? Email <a href="mailto:support@doyinmart.com">support@doyinmart.com</a>.
      </p>

      <p style={{ marginTop: 24, fontSize: 11, color: "var(--text-tertiary)" }}>
        This is a starter template and not legal advice. Have a qualified lawyer review it before
        going live.
      </p>
    </>
  );
}
