# DmartCard — Gift Card App (Flutter) — Implementation Plan

Status: **planned, not built.** Depends on `gift-cards-plan.md` (backend) and
`mobile-app-plan.md` (shared mobile architecture).

**DmartCard** is a focused Flutter app to **buy, gift, redeem, and manage** DoyinMart
gift cards. It reuses the shared `dmart_core` (auth + API client) and `dmart_ui`
(brand design system) packages, so it isn't a separate codebase — it's a second app
target in the same melos workspace.

---

## 1. What it does

- **Buy** a gift card: pick an amount (preset tiers + custom), optionally name a
  recipient + message, pay via Paystack.
- **Gift** it: send by email/SMS/WhatsApp/share-sheet, or show a **QR code**.
- **Redeem**: enter a code (or **scan a QR**) → credit lands as **store credit /
  wallet balance**, or is applied directly to a checkout.
- **Manage**: see my cards, balances, and transaction history; check a card's
  balance by entering its code.

It is the consumer front-end for the gift-card backend defined in
`gift-cards-plan.md` (table `gift_cards`, ledger `gift_card_txns`, atomic
`redeem_gift_card` RPC).

---

## 2. Architecture (reuses the mobile stack)

Same model as the store app: **Supabase** (auth + RLS reads of the user's own cards)
+ **Next.js mobile REST API** for privileged actions (buy/issue/redeem run with the
service role server-side) + **Paystack WebView** for purchase. DmartCard ships no
service role and never computes balances client-side — the server is authoritative.

### Gift-card REST endpoints to add (`/api/mobile/giftcards/*`)
| Endpoint | Purpose |
|---|---|
| `POST /giftcards/buy` | create gift-card purchase order → Paystack URL (amount server-validated) |
| `GET  /giftcards` | the user's cards (purchased + received), balances |
| `POST /giftcards/balance` | check balance by code (rate-limited, generic errors) |
| `POST /giftcards/redeem` | redeem code/amount → atomic `redeem_gift_card` RPC; returns new balance |
| `GET  /giftcards/:id/txns` | a card's ledger history |

Issuing happens on the **webhook** (charge.success) — same authoritative path as the
web — which generates the code and emails/notifies the recipient.

---

## 3. Screens

- **Home / My Cards:** list of cards with balances, total available credit.
- **Buy:** amount tiers + custom, recipient (optional), message, → Paystack WebView →
  success (show the new card + its QR + share button).
- **Redeem:** enter code **or** scan QR (`mobile_scanner`) → confirm → balance added.
- **Card detail:** balance, QR (`qr_flutter`), transaction history, share, "use at
  checkout" deep link into the store app.
- **Balance check:** quick code entry → shows remaining (no login required, throttled).
- **Auth / Settings:** shared with `dmart_core` (Supabase). Theme via `dmart_ui`.

---

## 4. Gift-card-specific packages

On top of the shared stack (Supabase, dio, inappwebview, Riverpod, go_router):
- `qr_flutter` — generate a card's QR (encodes the code, or a signed deep link).
- `mobile_scanner` — scan a QR to redeem.
- `share_plus` — share a card by any channel.
- `local_auth` (optional) — biometric lock before revealing codes/redeeming.

QR payload = a **deep link** like `dmartcard://redeem?code=...` (or an HTTPS
universal link) so scanning from anywhere routes into redemption.

---

## 5. Security (inherits the gift-card backend rules)

- **Server-authoritative** balances and redemption — the app only displays results.
- **Atomic redeem** via the `redeem_gift_card` RPC (`WHERE balance >= amount`) — no
  double-spend, even with two devices racing the same code.
- **Rate-limit** balance-check and redeem (`checkRateLimit`) to stop code enumeration;
  **generic errors** (don't distinguish "invalid" from "empty").
- **High-entropy codes** (`crypto.randomBytes`), never guessable; QR encodes the same
  code or a signed token.
- **No service role** in the app; all privileged ops via the JWT-authenticated API.
- **Optional biometric lock** before showing/redeeming a code.
- Respect the **settlement / chargeback** decisions from `gift-cards-plan.md`
  (platform float vs pre-split; optional clearing-hold before a new card is redeemable).

---

## 6. Phases

1. Backend: gift-card schema + `/api/mobile/giftcards/*` (after `gift-cards-plan.md`
   web feature lands, so logic is shared).
2. DmartCard app target in the melos workspace; My Cards + buy (Paystack WebView).
3. Redeem (code entry) + balance check.
4. QR generate + scan; share/gift flows.
5. Wallet/store-credit view; deep link "use at checkout" into the store app.
6. Biometric lock, polish, store release.

**Open questions:** redeem-to-wallet vs apply-at-checkout (or both)? one app with a
gift tab vs standalone DmartCard (recommended: standalone, shared packages)? QR =
raw code vs signed deep link? guest balance-check allowed?
