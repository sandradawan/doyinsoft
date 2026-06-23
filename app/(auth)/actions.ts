"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasServiceRole, isSupabaseConfigured } from "@/lib/supabase/env";
import { initialsOf } from "@/lib/format";
import { checkRateLimit, clientId, isBot } from "@/lib/ratelimit";
import { emailButton, emailLayout, emailText, sendEmail } from "@/lib/email";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export interface AuthState {
  error?: string;
  notice?: string;
}

const DEMO_MSG =
  "Demo mode: connect a Supabase project (URL, anon key, service-role key) to enable real vendor accounts. The dashboard is open as a demo meanwhile.";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function safeNext(value: FormDataEntryValue | null): string {
  const next = String(value ?? "");
  // Only allow internal paths: must start with a single "/", and contain no
  // backslash or protocol-relative "//" that could redirect off-site.
  const ok = next.startsWith("/") && !next.startsWith("//") && !next.includes("\\");
  return ok ? next : "/vendor/dashboard";
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured) return { error: DEMO_MSG };

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  redirect(next);
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured) return { error: DEMO_MSG };
  if (isBot(formData)) return { error: "Something went wrong. Please try again." };
  if (!(await checkRateLimit(`signup:${await clientId()}`, 5, 60_000)))
    return { error: "Too many attempts — please wait a minute and try again." };

  const businessName = String(formData.get("business_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (!businessName) return { error: "Business / vendor name is required." };
  if (password.length < 6) return { error: "Password must be at least 6 characters." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) return { error: error.message };

  // Create the vendor profile owned by the new user.
  const userId = data.user?.id;
  if (userId) {
    const slug = `${slugify(businessName)}-${userId.slice(0, 4)}`;
    // Service role bypasses the email-confirmation timing gap; falls back to the
    // session client when no service-role key is set.
    const db = hasServiceRole ? createAdminClient() : supabase;
    const { error: vendorError } = await db.from("vendors").insert({
      owner: userId,
      slug,
      name: businessName,
      initials: initialsOf(businessName) || "V",
      verified: false,
    });
    if (vendorError) {
      return {
        error: `Account created, but the vendor profile could not be saved: ${vendorError.message}`,
      };
    }
  }

  // Welcome the new vendor.
  await sendEmail({
    to: email,
    subject: "Welcome to DoyinSoft — let's get you selling",
    html: emailLayout(
      `Welcome, ${businessName} 👋`,
      `${emailText("Your seller account is ready. Here's how to get to your first sale:")}
       <ul style="font-size:13px;color:#525252;line-height:1.8;padding-left:18px;margin:0 0 16px;">
         <li>Add your WhatsApp number and connect your bank</li>
         <li>List your first product (software, digital, physical or a service)</li>
         <li>Share your link and start earning</li>
       </ul>
       <div style="margin:18px 0;">${emailButton(`${SITE_URL}/vendor/dashboard`, "Go to your dashboard")}</div>`
    ),
  });

  // If email confirmation is off, a session exists now → straight to dashboard.
  if (data.session) redirect(next);

  // Otherwise ask them to confirm their email first.
  redirect("/sign-in?notice=confirm-email");
}

/** Buyer sign-up — creates an auth account only (no vendor profile). */
export async function signUpBuyer(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured) return { error: DEMO_MSG };
  if (isBot(formData)) return { error: "Something went wrong. Please try again." };
  if (!(await checkRateLimit(`signup:${await clientId()}`, 5, 60_000)))
    return { error: "Too many attempts — please wait a minute and try again." };

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (password.length < 6) return { error: "Password must be at least 6 characters." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) return { error: error.message };

  // Welcome the new buyer.
  await sendEmail({
    to: email,
    subject: "Welcome to DoyinSoft 👋",
    html: emailLayout(
      "Welcome to DoyinSoft 👋",
      `${emailText("Your account is ready. Discover software, digital products, fashion and services from independent African sellers.")}
       ${emailText(`Tip: refer friends and <a href="${SITE_URL}/affiliate" style="color:#047857;">earn a commission</a> on what they buy.`)}
       <div style="margin:18px 0;">${emailButton(SITE_URL, "Start browsing")}</div>`
    ),
  });

  if (data.session) redirect(next);
  redirect("/sign-in?notice=confirm-email");
}

export async function signOut() {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
