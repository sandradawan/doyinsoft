# DoyinMart — deployment checklist

A repeatable launch. Work top to bottom; the **must-do** items gate going live.

## 0. Pre-flight (must-do)
- [ ] **Rotate the Gmail app password** that was shared in chat
      (`doyintechnology@gmail.com`). Generate a new app password and update
      `GMAIL_APP_PASSWORD` (or `.env.gmail`) — the old one is considered leaked.
- [ ] Confirm `.env.local`, `.env.gmail` are **gitignored** (they are) and never
      committed. Service-role / Paystack secret / `FCM_SERVICE_ACCOUNT` are
      **server-only** and must not appear in `mobile/` or any client.

## 1. Database (must-do)
- [ ] Apply all migrations in order, **or** run `supabase/setup.sql` (idempotent —
      safe to re-run; it brings any partially-migrated DB fully up to date).
- [ ] **Verify** with the schema checker — it catches the partial-migration bug
      class (e.g. a skipped column) before users hit it:
      ```bash
      node scripts/check-schema.mjs
      ```
      Must print `✓ Schema matches`. Currently pending: migration **0029**
      (`device_tokens`) for push.
- [ ] Confirm **backups / PITR** are enabled in Supabase (paid tiers). One bad
      migration without a backup = data loss.

## 2. Environment variables (Vercel → Project → Settings → Environment Variables)
Required:
- [ ] `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- [ ] `PAYSTACK_SECRET_KEY` — **use the live `sk_live_...` key** (a test/live
      mismatch makes payment verification silently fail). `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`.
- [ ] `NEXT_PUBLIC_SITE_URL` = `https://your-domain` (used in emails + callbacks)
- [ ] Gmail/SMTP vars for transactional email
- [ ] `NEXT_PUBLIC_USD_TO_NGN` if you sell USD gift cards (default 1600)

Recommended for scale (see §5):
- [ ] `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- [ ] Supabase **transaction pooler** connection string for serverless

Optional:
- [ ] `FCM_SERVICE_ACCOUNT` (push — see `docs/push-notifications.md`)

## 3. Paystack (must-do)
- [ ] Account fully **verified for live charges**.
- [ ] **Webhook URL** set: `https://your-domain/api/webhooks/paystack`. This is the
      trusted source of truth that issues licenses and gift cards even if the buyer
      closes the tab. Confirm it shows recent deliveries after a test purchase.
- [ ] Do one **end-to-end live test**: buy a product and a gift card with a real
      card, confirm the license/gift email arrives, then refund it from the
      dashboard to verify the refund path.

## 4. Deploy the web
- [ ] Merge to `main` → Vercel auto-deploys (or `vercel --prod`).
- [ ] Smoke test: home loads, a product page, checkout starts, `/gift-cards` buys,
      `/api/health` returns ok, admin loads for an admin account.

## 5. Scale (handles 10k+/day — already in code)
- [ ] Catalog is paginated + CDN-cached; stores aggregate via the `store_cards`
      RPC. Nothing to do but verify `node scripts/check-schema.mjs` passes.
- [ ] Set the **Upstash** vars so rate limiting holds across serverless instances
      (in-memory limits don't).
- [ ] Point the server DB connection at the **Supabase pooler** (transaction mode,
      port 6543) so bursts don't exhaust connections.

## 6. Observability (recommended before scale)
- [ ] Add error tracking (e.g. Sentry: `@sentry/nextjs`, set `SENTRY_DSN`). Without
      it you learn about outages from users.
- [ ] Add an uptime monitor on `/api/health`.

## 7. Mobile app
- [ ] Build with the real defines:
      ```bash
      cd mobile
      flutter build apk --dart-define=API_BASE=https://your-domain \
        --dart-define=SUPABASE_URL=... --dart-define=SUPABASE_ANON_KEY=...
      ```
- [ ] For push: complete `docs/push-notifications.md` (Firebase project + files).
- [ ] Store listings: signing keys, screenshots, privacy policy URL
      (`/legal/privacy`), data-safety form, then submit to Play / App Store.

## 8. Legal (must-do for real money + PII)
- [ ] Review `/legal/privacy`, `/legal/terms`, `/legal/refunds` — make sure they
      reflect your real business name, contact, and refund policy (not placeholders).

---

### Quick "is it live-ready?" gate
Run these; all must be green:
```bash
npx tsc --noEmit            # types clean
node scripts/check-schema.mjs   # DB matches the app
cd mobile && flutter analyze    # app analyzes clean
```
Then confirm: Gmail password rotated · Paystack live key + webhook · backups on.
