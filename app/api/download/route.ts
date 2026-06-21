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
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("order");
  const key = searchParams.get("key");

  let license = orderId ? await getLicenseByOrder(orderId) : null;
  if (!license && key) license = await getLicenseByKey(key);

  if (!license) {
    return NextResponse.json({ error: "No license found for this download." }, { status: 404 });
  }
  if (license.status !== "active") {
    return NextResponse.json({ error: "This license is not active." }, { status: 403 });
  }
  // If a key is supplied it must match the resolved license.
  if (key && license.key !== key) {
    return NextResponse.json({ error: "License key does not match." }, { status: 403 });
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
