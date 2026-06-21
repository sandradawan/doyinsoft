import { getCurrentAdmin } from "@/lib/admin";
import { adminOrders } from "@/lib/data";
import type { OrderStatus } from "@/lib/types";

function csvCell(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** GET /admin/orders/export?status=  → CSV download of orders. */
export async function GET(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return new Response("Forbidden", { status: 403 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const orders = await adminOrders(
    status && status !== "all" ? (status as OrderStatus) : undefined
  );

  const header = ["id", "date", "product", "buyer", "amount", "currency", "status", "gateway"];
  const rows = orders.map((o) => [
    o.id,
    o.created_at,
    o.product.name,
    o.buyer_name,
    (o.amount_minor / 100).toFixed(2),
    o.currency,
    o.status,
    o.gateway,
  ]);
  const csv = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="doyinsoft-orders.csv"`,
    },
  });
}
