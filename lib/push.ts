import "server-only";
import { createSign } from "crypto";
import { createAdminClient } from "./supabase/admin";
import { hasServiceRole } from "./supabase/env";

// Firebase Cloud Messaging (HTTP v1) sender — no SDK dependency. Dormant until
// FCM_SERVICE_ACCOUNT is set, so the app builds and runs without push configured.
//
// FCM_SERVICE_ACCOUNT = the full service-account JSON (one line), from the
// Firebase console → Project settings → Service accounts → Generate new private
// key. Server-only; never expose it to the client.

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

function serviceAccount(): ServiceAccount | null {
  const raw = process.env.FCM_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    const sa = JSON.parse(raw) as ServiceAccount;
    if (sa.project_id && sa.client_email && sa.private_key) return sa;
  } catch {
    console.error("[push] FCM_SERVICE_ACCOUNT is not valid JSON");
  }
  return null;
}

export const isPushConfigured = !!process.env.FCM_SERVICE_ACCOUNT;

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Cache the OAuth access token in memory until shortly before it expires.
let cachedToken: { value: string; exp: number } | null = null;

async function getAccessToken(sa: ServiceAccount): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.value;

  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claim}`);
  const signature = base64url(signer.sign(sa.private_key));
  const jwt = `${header}.${claim}.${signature}`;

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });
    const json = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!json.access_token) {
      console.error("[push] token exchange failed:", JSON.stringify(json).slice(0, 200));
      return null;
    }
    cachedToken = { value: json.access_token, exp: now + (json.expires_in ?? 3600) };
    return json.access_token;
  } catch (e) {
    console.error("[push] token exchange error:", e);
    return null;
  }
}

export interface PushPayload {
  title: string;
  body?: string;
  link?: string;
}

/** Send to a set of device tokens. Prunes tokens FCM reports as dead. */
async function sendToTokens(tokens: string[], payload: PushPayload): Promise<void> {
  const sa = serviceAccount();
  if (!sa || tokens.length === 0) return;
  const accessToken = await getAccessToken(sa);
  if (!accessToken) return;

  const endpoint = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;
  const dead: string[] = [];

  await Promise.all(
    tokens.map(async (token) => {
      const message = {
        token,
        notification: { title: payload.title, body: payload.body ?? "" },
        data: payload.link ? { link: payload.link } : {},
        android: { priority: "high", notification: { sound: "default" } },
        apns: { payload: { aps: { sound: "default" } } },
      };
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ message }),
        });
        if (res.status === 404 || res.status === 400) {
          // UNREGISTERED / invalid token — drop it.
          dead.push(token);
        }
      } catch (e) {
        console.error("[push] send error:", e);
      }
    })
  );

  if (dead.length) {
    try {
      await createAdminClient().from("device_tokens").delete().in("token", dead);
    } catch {
      // pruning is best-effort
    }
  }
}

/**
 * Push to a recipient identified by user id and/or email (matches notify()).
 * Best-effort and fully no-op when push isn't configured.
 */
export async function pushToRecipient(
  who: { userId?: string | null; email?: string | null },
  payload: PushPayload
): Promise<void> {
  if (!isPushConfigured || !hasServiceRole) return;
  if (!who.userId && !who.email) return;
  try {
    const admin = createAdminClient();
    // Match by user_id OR email so it works whether the event carried either.
    const filters: string[] = [];
    if (who.userId) filters.push(`user_id.eq.${who.userId}`);
    if (who.email && !/[,()]/.test(who.email)) filters.push(`email.eq.${who.email}`);
    if (filters.length === 0) return;
    const { data } = await admin.from("device_tokens").select("token").or(filters.join(","));
    const tokens = [...new Set(((data as { token: string }[]) ?? []).map((r) => r.token))];
    await sendToTokens(tokens, payload);
  } catch (e) {
    console.error("[push] pushToRecipient error:", e);
  }
}

/**
 * Verbose, single-shot test of the whole send path for one recipient. Returns a
 * human-readable summary (config → service account → Google auth → per-token FCM
 * response) so the admin "Send test push" button can pinpoint exactly what fails.
 */
export async function pushDiagnostics(who: {
  userId?: string | null;
  email?: string | null;
}): Promise<string> {
  if (!isPushConfigured) return "✗ FCM_SERVICE_ACCOUNT is not set on the server (Vercel env). Add it and redeploy.";
  if (!hasServiceRole) return "✗ No Supabase service role configured on the server.";
  const sa = serviceAccount();
  if (!sa) return "✗ FCM_SERVICE_ACCOUNT is set but isn’t valid JSON (check it was pasted whole).";

  const admin = createAdminClient();
  const filters: string[] = [];
  if (who.userId) filters.push(`user_id.eq.${who.userId}`);
  if (who.email && !/[,()]/.test(who.email)) filters.push(`email.eq.${who.email}`);
  if (filters.length === 0) return "✗ No user id or email to look up tokens for.";
  const { data } = await admin.from("device_tokens").select("token").or(filters.join(","));
  const tokens = [...new Set(((data as { token: string }[]) ?? []).map((r) => r.token))];
  if (tokens.length === 0)
    return `✗ No device tokens registered for ${who.email ?? who.userId}. Open the app, sign in as that user, and check the logs say “Push token registered”.`;

  const accessToken = await getAccessToken(sa);
  if (!accessToken)
    return `✗ Google rejected the service account (couldn’t get an access token). The FCM_SERVICE_ACCOUNT is wrong, malformed, or from a different project. project_id=${sa.project_id}`;

  const endpoint = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;
  const lines: string[] = [];
  for (const token of tokens) {
    const message = {
      token,
      notification: { title: "DoyinMart test 🔔", body: "Push notifications are working." },
      android: { priority: "high", notification: { sound: "default" } },
    };
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const body = await res.text();
      lines.push(res.ok ? `✓ sent to ${token.slice(0, 12)}…` : `✗ ${res.status} ${token.slice(0, 12)}… → ${body.slice(0, 160)}`);
    } catch (e) {
      lines.push(`✗ network error: ${String(e).slice(0, 120)}`);
    }
  }
  return `project=${sa.project_id}, tokens=${tokens.length}\n${lines.join("\n")}`;
}
