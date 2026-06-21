import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { VendorShell } from "@/components/vendor-shell";
import { requireVendor } from "@/lib/auth";
import { getVendorProductById } from "@/lib/data";
import { EditProductForm } from "./edit-form";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const vendor = await requireVendor();
  const { id } = await params;
  const product = await getVendorProductById(id, vendor.id);
  if (!product) notFound();

  return (
    <VendorShell active="products">
      <Link
        href="/vendor/products"
        className="inline-flex items-center gap-1 text-[12px] text-ink-soft no-underline hover:text-ink mb-3"
      >
        <ChevronLeft size={14} aria-hidden /> Products
      </Link>
      <h1 className="text-[22px] font-medium m-0 mb-1">Edit {product.name}</h1>
      <p className="text-[13px] text-ink-soft m-0 mb-6">
        Update details, publish a new version, or remove the product.
      </p>
      <EditProductForm product={product} vendorId={vendor.id} />
    </VendorShell>
  );
}
