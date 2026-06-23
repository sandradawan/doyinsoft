import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Package, Store } from "lucide-react";
import { TopNav } from "@/components/top-nav";
import { Footer } from "@/components/footer";
import { getProducts } from "@/lib/data";
import type { Vendor } from "@/lib/types";

export const metadata: Metadata = {
  title: "Stores — DoyinMart",
  description: "Browse independent sellers on DoyinMart.",
};

interface StoreRow {
  vendor: Vendor;
  products: number;
  downloads: number;
}

export default async function StoresPage() {
  const products = await getProducts();

  const map = new Map<string, StoreRow>();
  for (const p of products) {
    if (p.vendor.suspended) continue;
    const row = map.get(p.vendor.id) ?? { vendor: p.vendor, products: 0, downloads: 0 };
    row.products += 1;
    row.downloads += p.download_count;
    map.set(p.vendor.id, row);
  }
  const stores = [...map.values()].sort(
    (a, b) => Number(b.vendor.verified) - Number(a.vendor.verified) || b.products - a.products
  );

  return (
    <main className="max-w-5xl mx-auto px-5 py-6">
      <TopNav />

      <div className="flex items-center gap-2 mb-1">
        <Store size={18} className="text-brand" />
        <h1 className="text-[22px] font-medium m-0">Stores</h1>
      </div>
      <p className="text-[14px] text-ink-soft m-0 mb-6">
        {stores.length} independent seller{stores.length === 1 ? "" : "s"} on DoyinMart
      </p>

      {stores.length === 0 ? (
        <p className="text-[13px] text-ink-soft">No stores yet.</p>
      ) : (
        <section
          className="grid gap-3"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}
        >
          {stores.map(({ vendor, products: count, downloads }) => (
            <Link
              key={vendor.id}
              href={`/store/${vendor.slug}`}
              className="border border-line rounded-lg p-4 no-underline text-ink hover:border-brand transition-colors flex items-center gap-3"
            >
              <div className="w-12 h-12 rounded-full bg-info-bg flex items-center justify-center text-[16px] font-medium text-info shrink-0">
                {vendor.initials}
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-medium m-0 inline-flex items-center gap-1 truncate">
                  {vendor.name}
                  {vendor.verified && <BadgeCheck size={14} className="text-success" />}
                </p>
                <p className="text-[12px] text-ink-soft m-0 inline-flex items-center gap-1">
                  <Package size={11} /> {count} product{count === 1 ? "" : "s"}
                  {downloads > 0 ? ` · ${downloads.toLocaleString()} downloads` : ""}
                </p>
              </div>
            </Link>
          ))}
        </section>
      )}

      <Footer />
    </main>
  );
}
