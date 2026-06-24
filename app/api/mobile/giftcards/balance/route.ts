import { validateGiftCard } from "@/lib/giftcards";
import { json, preflight } from "@/lib/mobile/api";
import { checkRateLimit, clientId } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";
export function OPTIONS() {
  return preflight();
}

/** POST /api/mobile/giftcards/balance { code } — check a gift card balance. */
export async function POST(request: Request) {
  if (!(await checkRateLimit(`mob-gift:${await clientId()}`, 12, 60_000))) {
    return json({ ok: false, error: "Too many requests." }, 429);
  }
  let code = "";
  try {
    const body = (await request.json()) as { code?: string };
    code = String(body.code ?? "");
  } catch {
    return json({ ok: false, error: "Invalid body." }, 400);
  }
  const res = await validateGiftCard(code);
  return json(res, res.ok ? 200 : 400);
}
