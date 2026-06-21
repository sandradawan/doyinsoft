import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck } from "lucide-react";
import { Logo } from "@/components/logo";
import { Footer } from "@/components/footer";
import { ProductCard } from "@/components/product-card";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { getStoreProducts, getVendorBySlug } from "@/lib/data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const vendor = await getVendorBySlug(slug);
  if (!vendor) return { title: "Store not found — DoyinSoft" };
  const title = `${vendor.name} — store on DoyinSoft`;
  return {
    title,
    description: `Shop ${vendor.name}'s products on DoyinSoft.`,
    openGraph: { title, type: "website" },
  };
}

export default async function StorePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const vendor = await getVendorBySlug(slug);
  if (!vendor || vendor.suspended) notFound();
  const products = await getStoreProducts(vendor.id);

  return (
    <main className="max-w-5xl mx-auto px-5 py-6">
      <header className="flex items-center justify-between border-b border-line pb-[14px] mb-6">
        <Logo />
        <Link href="/" className="text-[13px] text-ink-soft no-underline hover:text-ink">
          ← All stores
        </Link>
      </header>

      {/* Vendor header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-14 h-14 rounded-full bg-info-bg flex items-center justify-center text-[18px] font-medium text-info shrink-0">
          {vendor.initials}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-[22px] font-medium m-0 inline-flex items-center gap-1">
            {vendor.name}
            {vendor.verified && <BadgeCheck size={16} className="text-success" />}
          </h1>
          <p className="text-[12px] text-ink-soft m-0">{products.length} products</p>
        </div>
        {vendor.whatsapp && (
          <WhatsAppButton
            phone={vendor.whatsapp}
            text={`Hi ${vendor.name}, I found your store on DoyinSoft.`}
            label="Chat"
          />
        )}
      </div>

      {products.length === 0 ? (
        <p className="text-[13px] text-ink-soft">No products yet.</p>
      ) : (
        <section
          className="grid gap-3"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}
        >
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </section>
      )}

      <Footer />
    </main>
  );
}
