import "server-only";

const KEY = process.env.RESEND_API_KEY ?? "";
const FROM = process.env.EMAIL_FROM ?? "DoyinSoft <onboarding@resend.dev>";

export const isEmailConfigured = KEY.length > 0;

/**
 * Send a transactional email via Resend's HTTP API. Fire-and-forget: if no key
 * is configured it just logs, so the app works without email set up.
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  if (!KEY || !opts.to) {
    console.log(`[email skipped] to=${opts.to} subject="${opts.subject}"`);
    return;
  }
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: opts.to, subject: opts.subject, html: opts.html }),
    });
  } catch (e) {
    console.error("sendEmail:", e);
  }
}

/** Minimal branded wrapper so emails look consistent. */
export function emailLayout(title: string, bodyHtml: string): string {
  return `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#171717">
    <p style="font-size:16px;font-weight:600;color:#047857">DoyinSoft</p>
    <h1 style="font-size:18px;margin:0 0 12px">${title}</h1>
    ${bodyHtml}
    <p style="font-size:11px;color:#a3a3a3;margin-top:24px">Software built for African markets.</p>
  </div>`;
}
