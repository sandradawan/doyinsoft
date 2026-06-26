import { getStoresWithDetails } from "@/lib/data";
import { jsonCached, preflight } from "@/lib/mobile/api";

export function OPTIONS() {
  return preflight();
}

/** GET /api/mobile/stores — sellers with counts, bio and cover for card display. */
export async function GET() {
  const stores = await getStoresWithDetails();
  return jsonCached({ stores }, 60);
}
