import { createAdminClient } from "@/lib/supabase/admin";
import { json, preflight, getMobileUser, getVendorIdForUser } from "@/lib/mobile/api";

export const dynamic = "force-dynamic";
export function OPTIONS() {
  return preflight();
}

interface OrderRow {
  id: string;
  amount_minor: number;
  currency: string;
  created_at: string;
  buyer_name: string | null;
  buyer_email: string | null;
  product: { name?: string } | { name?: string }[] | null;
}

/** GET — the signed-in vendor's paid sales (most recent first) + totals. */
export async function GET(request: Request) {
  const user = await getMobileUser(request);
  if (!user) return json({ error: "Please sign in." }, 401);
  const vendorId = await getVendorIdForUser(user.id);
  if (!vendorId) return json({ store: false, sales: [], count: 0, total_minor: 0 });

  const { data } = await createAdminClient()
    .from("orders")
    .select("id, amount_minor, currency, created_at, buyer_name, buyer_email, product:products(name)")
    .eq("vendor_id", vendorId)
    .eq("status", "paid")
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = (data as OrderRow[]) ?? [];
  const sales = rows.map((r) => {
    const p = Array.isArray(r.product) ? r.product[0] : r.product;
    return {
      id: r.id,
      product_name: p?.name ?? "Product",
      amount_minor: r.amount_minor,
      currency: r.currency,
      created_at: r.created_at,
      buyer: r.buyer_name || r.buyer_email || "A customer",
    };
  });
  // Total revenue across the listed sales (in their own currency, NGN dominant).
  const total_minor = sales.reduce((t, s) => t + (s.amount_minor || 0), 0);
  return json({ store: true, sales, count: sales.length, total_minor });
}
