import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { VendorShell } from "@/components/vendor-shell";
import { requireVendor } from "@/lib/auth";
import { getCategories } from "@/lib/data";
import { ProductForm } from "./product-form";

export default async function NewProductPage() {
  await requireVendor();
  const categories = await getCategories();
  return (
    <VendorShell active="products">
      <Link
        href="/vendor/products"
        className="inline-flex items-center gap-1 text-[12px] text-ink-soft no-underline hover:text-ink mb-3"
      >
        <ChevronLeft size={14} aria-hidden /> Products
      </Link>
      <h1 className="text-[22px] font-medium m-0 mb-1">Add product</h1>
      <p className="text-[13px] text-ink-soft m-0 mb-6">
        Upload your software and set how it sells. A license key is minted for each buyer
        automatically.
      </p>
      <ProductForm categories={categories} />
    </VendorShell>
  );
}
