import { NextResponse } from "next/server";
import { getLicenseByKey } from "@/lib/data";
import { hasServiceRole } from "@/lib/supabase/env";
import { clientId, rateLimit } from "@/lib/ratelimit";

const KEY_RE = /^DOYIN-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/;

/**
 * License activation endpoint for the desktop/mobile apps.
 *
 *   POST /api/licenses/verify   { "key": "DOYIN-XXXX-XXXX-XXXX-XXXX" }
 *   -> { valid, status, product? }
 */
export async function POST(request: Request) {
  // Throttle to deter brute-force / enumeration of the licence oracle.
  if (!rateLimit(`license-verify:${await clientId()}`, 20, 60_000)) {
    return NextResponse.json({ valid: false, error: "Too many requests." }, { status: 429 });
  }

  let key = "";
  try {
    const body = (await request.json()) as { key?: string };
    key = String(body.key ?? "").trim().toUpperCase();
  } catch {
    return NextResponse.json({ valid: false, error: "Invalid JSON body." }, { status: 400 });
  }

  if (!KEY_RE.test(key)) {
    return NextResponse.json({ valid: false, error: "Malformed license key." }, { status: 400 });
  }

  // Without a connected backend we can only validate the format.
  if (!hasServiceRole) {
    return NextResponse.json({
      valid: true,
      status: "active",
      demo: true,
      note: "Format valid. Connect Supabase to verify against issued licenses.",
    });
  }

  const license = await getLicenseByKey(key);
  if (!license) {
    return NextResponse.json({ valid: false, error: "License not found." }, { status: 404 });
  }

  return NextResponse.json({
    valid: license.status === "active",
    status: license.status,
    product: {
      name: license.product.name,
      slug: license.product.slug,
      version: license.product.version,
    },
    issued_at: license.issued_at,
  });
}
