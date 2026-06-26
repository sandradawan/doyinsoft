#!/usr/bin/env node
/**
 * Pre-deploy schema check: confirms the production database actually has every
 * table, column and RPC the app expects — the partial-migration class of bug
 * (e.g. a skipped `gift_cards.design`) that fails silently at runtime.
 *
 * Usage:  node scripts/check-schema.mjs
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local
 * (or the environment). Read-only. Exits non-zero if anything is missing.
 */
import { readFileSync } from "fs";

function loadEnv() {
  const env = { ...process.env };
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      if (!line.includes("=") || line.trim().startsWith("#")) continue;
      const i = line.indexOf("=");
      const k = line.slice(0, i).trim();
      if (!(k in env)) env[k] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    /* no .env.local — rely on real env */
  }
  return env;
}

const env = loadEnv();
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(2);
}
const h = { apikey: KEY, Authorization: `Bearer ${KEY}` };

// table -> columns the app reads/writes
const EXPECT = {
  vendors: ["id", "slug", "name", "initials", "verified", "suspended", "bio", "cover_url", "owner"],
  products: ["id", "slug", "name", "vendor_id", "price_minor", "currency", "status", "product_type", "download_count", "icon_url"],
  orders: ["id", "product_id", "vendor_id", "status", "amount_minor", "currency", "gift_card_minor", "gift_card_debit_minor", "buyer_email"],
  gift_cards: ["id", "code", "initial_minor", "balance_minor", "currency", "status", "design", "recipient_email", "purchaser_email", "message", "purchase_reference", "batch_ref", "activation_token", "expires_at"],
  follows: ["vendor_id"],
  wishlists: ["id"],
  notifications: ["id", "email", "user_id", "type", "read"],
  device_tokens: ["id", "user_id", "email", "token", "platform"],
  reviews: ["id", "product_id", "rating"],
  categories: ["name"],
};
const RPCS = {
  store_cards: {},
  redeem_gift_card: { p_code: "x", p_amount: 0, p_order: "00000000-0000-0000-0000-000000000000" },
  vendor_metrics_30d: { p_vendor_id: "00000000-0000-0000-0000-000000000000" },
};

let failed = 0;

console.log(`\nChecking schema on ${URL}\n`);
for (const [table, cols] of Object.entries(EXPECT)) {
  // One request asking for all columns at once; PostgREST 200 = all exist.
  const r = await fetch(`${URL}/rest/v1/${table}?select=${cols.join(",")}&limit=1`, { headers: h });
  if (r.status === 200) {
    console.log(`  OK   ${table} (${cols.length} cols)`);
  } else {
    failed++;
    const body = await r.text();
    const miss = /column "?([a-z_]+)"? .* does not exist/i.exec(body) || /find the '([a-z_]+)' column/i.exec(body);
    console.log(`  FAIL ${table} -> ${miss ? `missing column: ${miss[1]}` : `${r.status} ${body.slice(0, 120)}`}`);
  }
}
for (const [fn, args] of Object.entries(RPCS)) {
  const r = await fetch(`${URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { ...h, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  // 404 = function missing. Anything else (200/400/409/etc.) = it exists.
  if (r.status === 404) {
    failed++;
    console.log(`  FAIL rpc:${fn} -> not found`);
  } else {
    console.log(`  OK   rpc:${fn}`);
  }
}

console.log("");
if (failed) {
  console.error(`✗ ${failed} schema problem(s). Run the pending migrations (or supabase/setup.sql).`);
  process.exit(1);
}
console.log("✓ Schema matches the app's expectations.");
