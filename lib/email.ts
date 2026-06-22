import "server-only";
import nodemailer from "nodemailer";

// --- Gmail SMTP (App Password) ---
const GMAIL_USER = process.env.GMAIL_USER ?? "";
const GMAIL_PASS = process.env.GMAIL_APP_PASSWORD ?? "";

// --- Resend (fallback) ---
const RESEND_KEY = process.env.RESEND_API_KEY ?? "";

const FROM =
  process.env.EMAIL_FROM ||
  (GMAIL_USER ? `DoyinSoft <${GMAIL_USER}>` : "DoyinSoft <onboarding@resend.dev>");

export const isEmailConfigured = Boolean((GMAIL_USER && GMAIL_PASS) || RESEND_KEY);

let transporter: nodemailer.Transporter | null = null;
function gmailTransport() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: GMAIL_USER, pass: GMAIL_PASS },
    });
  }
  return transporter;
}

/**
 * Send a transactional email. Uses Gmail SMTP when GMAIL_USER + GMAIL_APP_PASSWORD
 * are set, otherwise Resend, otherwise just logs. Fire-and-forget — never throws
 * into the caller.
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  if (!opts.to) return;

  // Gmail (note: Gmail rewrites the From address to the authenticated account).
  if (GMAIL_USER && GMAIL_PASS) {
    try {
      await gmailTransport().sendMail({
        from: FROM,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
      });
    } catch (e) {
      console.error("sendEmail (gmail):", e);
    }
    return;
  }

  // Resend
  if (RESEND_KEY) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: FROM, to: opts.to, subject: opts.subject, html: opts.html }),
      });
    } catch (e) {
      console.error("sendEmail (resend):", e);
    }
    return;
  }

  console.log(`[email skipped — none configured] to=${opts.to} subject="${opts.subject}"`);
}

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://doyinsoft.vercel.app";

/** A branded, email-client-safe (table + inline styles) wrapper. */
export function emailLayout(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:24px 12px;background:#f5f5f4;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="width:480px;max-width:100%;background:#ffffff;border:1px solid #e5e5e5;border-radius:14px;overflow:hidden;">
      <tr><td style="background:#047857;padding:18px 28px;">
        <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.2px;">DoyinSoft</span>
      </td></tr>
      <tr><td style="padding:28px;">
        <h1 style="font-size:19px;line-height:1.3;margin:0 0 16px;color:#171717;font-weight:600;">${title}</h1>
        ${bodyHtml}
      </td></tr>
      <tr><td style="padding:18px 28px;border-top:1px solid #eeeeee;background:#fafafa;">
        <p style="font-size:11px;color:#a3a3a3;margin:0 0 6px;">Software &amp; digital products built for African markets.</p>
        <p style="font-size:11px;color:#a3a3a3;margin:0;">
          <a href="${SITE}" style="color:#737373;text-decoration:none;">Store</a> &nbsp;·&nbsp;
          <a href="${SITE}/legal/terms" style="color:#737373;text-decoration:none;">Terms</a> &nbsp;·&nbsp;
          <a href="${SITE}/legal/privacy" style="color:#737373;text-decoration:none;">Privacy</a>
        </p>
      </td></tr>
    </table>
    <p style="font-size:11px;color:#a3a3a3;margin:14px 0 0;">© 2026 DoyinSoft. All rights reserved.</p>
  </td></tr></table>
</body></html>`;
}

/** A styled call-to-action button for emails. */
export function emailButton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#047857;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 22px;border-radius:8px;">${label}</a>`;
}

/** A highlighted box for a license key or code. */
export function emailKeyBox(value: string): string {
  return `<div style="background:#f5f5f4;border:1px solid #e5e5e5;border-radius:8px;padding:14px 16px;text-align:center;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:16px;font-weight:600;letter-spacing:1px;color:#171717;word-break:break-all;">${value}</div>`;
}

/** Light paragraph helper for email body copy. */
export function emailText(html: string): string {
  return `<p style="font-size:13px;line-height:1.6;color:#525252;margin:0 0 14px;">${html}</p>`;
}
