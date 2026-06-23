import type { Metadata } from "next";

export const metadata: Metadata = { title: "Refund Policy — DoyinMart" };

export default function RefundsPage() {
  return (
    <>
      <h1>Refund Policy</h1>
      <p className="updated">Last updated: 22 June 2026</p>

      <p>
        We want buyers and sellers to trade with confidence. Because DoyinMart lists different kinds
        of products, refunds depend on what was purchased.
      </p>

      <h2>1. Software &amp; digital products</h2>
      <ul>
        <li>Digital goods and licence keys are delivered instantly and are generally non-refundable once the licence is issued or the file is downloaded.</li>
        <li>Exceptions: the product is faulty, materially not as described, or fails to download/activate and the Vendor cannot resolve it.</li>
        <li>If approved, the licence is revoked and the payment refunded.</li>
      </ul>

      <h2>2. Physical goods</h2>
      <ul>
        <li>You may request a refund or replacement if an item arrives damaged, defective, or significantly different from its description.</li>
        <li>Report issues within 7 days of delivery, with photos where relevant.</li>
        <li>Return shipping terms are set by the Vendor.</li>
      </ul>

      <h2>3. Services</h2>
      <p>
        Refunds for services depend on what was agreed and delivered. If a service was not provided
        as described, contact us and we will mediate with the Vendor.
      </p>

      <h2>4. How to request a refund</h2>
      <p>
        Email <a href="mailto:support@doyinsoft.com">support@doyinsoft.com</a> with your order
        reference and the reason. We review requests fairly, in line with this policy and Nigerian
        consumer-protection law.
      </p>

      <h2>5. How refunds are issued</h2>
      <p>
        Approved refunds are returned to your original payment method via Paystack. Processing times
        depend on your bank.
      </p>

      <h2>6. Chargebacks &amp; fraud</h2>
      <p>
        Fraudulent claims and abusive chargebacks may result in account suspension. Where a refund is
        issued, any related affiliate commission is reversed.
      </p>

      <p style={{ marginTop: 24, fontSize: 11, color: "var(--text-tertiary)" }}>
        This is a starter template and not legal advice. Have a qualified lawyer review it before
        going live.
      </p>
    </>
  );
}
