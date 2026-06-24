import { getStoresWithDetails } from "@/lib/data";
import { json, preflight } from "@/lib/mobile/api";

export const dynamic = "force-dynamic";
export function OPTIONS() {
  return preflight();
}

/** GET /api/mobile/stores — sellers with counts, bio and cover for card display. */
export async function GET() {
  const stores = await getStoresWithDetails();
  return json({ stores });
}
