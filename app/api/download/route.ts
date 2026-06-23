import { NextResponse } from "next/server";
import { getLicenseByKey, getLicenseByOrder, getProductBySlug } from "@/lib/data";
import { getSignedDownloadUrl } from "@/lib/storage";
import { licenseCertificate } from "@/lib/license";
import { hasServiceRole } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Gated download. Resolves the buyer's license (by order or key), confirms it's
 * active, then either redirects to a short-lived signed URL for the real file
 * or streams a license certificate (mock mode / products with no file).
 *
 *   GET /api/download?order=<id>&key=<licenseKey>
 *
 * The license KEY is the bearer secret and is REQUIRED — an order id alone (which
 * leaks in URLs/receipts) must never be sufficient to download. The key is the
 * 64-bit unguessable token issued only to the buyer.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("order");
  const key = searchParams.get("key");

  // A valid key is mandatory for every download.
  if (!key) {
    return NextResponse.json({ error: "A valid license key is required." }, { status: 401 });
  }

  // Resolve by key (authoritative). If an order is also given, it must match.
  const license =
    (await getLicenseByKey(key)) ?? (orderId ? await getLicenseByOrder(orderId) : null);

  if (!license || license.key !== key) {
    return NextResponse.json({ error: "License key does not match." }, { status: 403 });
  }
  if (license.status !== "active") {
    return NextResponse.json({ error: "This license is not active." }, { status: 403 });
  }

  const product = await getProductBySlug(license.product.slug);

  async function countDownload() {
    if (product && hasServiceRole) {
      await createAdminClient()
        .rpc("increment_download", { p_product_id: product.id })
        .then(() => undefined, () => undefined);
    }
  }

  // External vendor-hosted link → redirect to it (gated by the license above).
  if (product?.file_path && /^https?:\/\//i.test(product.file_path)) {
    await countDownload();
    return NextResponse.redirect(product.file_path);
  }

  // Legacy: real file in private storage → mint a signed URL and redirect.
  if (product?.file_path) {
    const signed = await getSignedDownloadUrl(
      product.file_path,
      product.file_name ?? undefined
    );
    if (signed) {
      await countDownload();
      return NextResponse.redirect(signed);
    }
  }

  // Fallback: hand back a license certificate so the flow always completes.
  const body = licenseCertificate({
    productName: license.product.name,
    version: license.product.version,
    key: license.key,
    email: license.email,
    issuedAt: license.issued_at,
  });
  const safeName = license.product.slug || "license";
  return new NextResponse(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "content-disposition": `attachment; filename="${safeName}-license.txt"`,
    },
  });
}
