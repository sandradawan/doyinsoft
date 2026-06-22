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

/** Minimal branded wrapper so emails look consistent. */
export function emailLayout(title: string, bodyHtml: string): string {
  return `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#171717">
    <p style="font-size:16px;font-weight:600;color:#047857">DoyinSoft</p>
    <h1 style="font-size:18px;margin:0 0 12px">${title}</h1>
    ${bodyHtml}
    <p style="font-size:11px;color:#a3a3a3;margin-top:24px">Software built for African markets.</p>
  </div>`;
}
