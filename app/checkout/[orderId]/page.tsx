import { notFound } from "next/navigation";
import { formatPrice } from "@/lib/format";
import { resolveCheckoutOrder } from "./actions";
import { CheckoutForm } from "./checkout-form";

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ product?: string }>;
}) {
  const { orderId } = await params;
  const { product: productSlug } = await searchParams;

  const order = await resolveCheckoutOrder(orderId, productSlug);
  if (!order) notFound();

  return (
    <main className="max-w-[460px] mx-auto px-5 py-8">
      {/* Order summary */}
      <div className="flex justify-between items-center pb-3 mb-3 border-b border-line">
        <div className="flex items-center gap-[10px]">
          <div className="w-8 h-8 bg-muted rounded-md" />
          <span className="text-[13px]">{order.product.name} license</span>
        </div>
        <span className="text-[13px]">
          {formatPrice(order.amount_minor, order.currency)}
        </span>
      </div>

      <CheckoutForm
        orderId={order.id}
        productSlug={order.product.slug}
        amountMinor={order.amount_minor}
        currency={order.currency}
      />
    </main>
  );
}
