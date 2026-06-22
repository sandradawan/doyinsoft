import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Legal — DoyinSoft" };

const DOCS = [
  { href: "/legal/terms", title: "Terms of Service", desc: "The rules for using DoyinSoft." },
  { href: "/legal/privacy", title: "Privacy Policy", desc: "What we collect and your rights." },
  { href: "/legal/refunds", title: "Refund Policy", desc: "Refunds for digital, physical & services." },
  { href: "/legal/vendor-agreement", title: "Vendor Agreement", desc: "Terms for selling on DoyinSoft." },
  { href: "/legal/acceptable-use", title: "Acceptable Use Policy", desc: "What's not allowed on the platform." },
  { href: "/legal/cookies", title: "Cookie Policy", desc: "How we use cookies." },
];

export default function LegalIndex() {
  return (
    <>
      <h1>Legal</h1>
      <p className="updated">Our policies and agreements</p>
      <div className="flex flex-col gap-2 mt-4 not-prose">
        {DOCS.map((d) => (
          <Link
            key={d.href}
            href={d.href}
            className="border border-line rounded-lg p-4 no-underline text-ink hover:border-brand transition-colors"
          >
            <p className="text-[14px] font-medium m-0">{d.title}</p>
            <p className="text-[12px] text-ink-soft m-0">{d.desc}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
