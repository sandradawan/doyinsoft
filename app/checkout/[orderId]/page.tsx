import { notFound } from "next/navigation";
import { formatPrice } from "@/lib/format";
import { toNgnCharge, USD_TO_NGN } from "@/lib/money";
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

  // Paystack (NGN account) is charged in NGN; convert USD-priced items.
  const chargeMinor = toNgnCharge(order.amount_minor, order.currency);
  const converted = order.currency !== "NGN";
  const productType = order.product.product_type ?? "digital";
  const noun = productType === "digital" ? "license" : "order";

  return (
    <main className="max-w-[460px] mx-auto px-5 py-8">
      {/* Order summary */}
      <div className="flex justify-between items-center pb-3 mb-1 border-b border-line">
        <div className="flex items-center gap-[10px]">
          <div className="w-8 h-8 bg-muted rounded-md" />
          <span className="text-[13px]">
            {order.product.name} {noun}
          </span>
        </div>
        <span className="text-[13px]">
          {formatPrice(order.amount_minor, order.currency)}
        </span>
      </div>

      {converted && (
        <p className="text-[11px] text-ink-faint mb-3">
          Charged in NGN: {formatPrice(chargeMinor, "NGN")} (at ₦{USD_TO_NGN.toLocaleString()}/$)
        </p>
      )}
      {!converted && <div className="mb-3" />}

      <CheckoutForm
        orderId={order.id}
        productSlug={order.product.slug}
        amountMinor={chargeMinor}
        currency="NGN"
        productType={productType}
      />
    </main>
  );
}
