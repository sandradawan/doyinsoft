# Gift Cards — Implementation Plan (DoyinMart)

Status: **planned, not built.** Target: next build session.

A buyer purchases a gift card (a stored-value code). A recipient redeems it to pay
for orders — either platform-wide or scoped to one store. Redemption is a payment
method at checkout, sitting alongside Paystack and coupons.

---

## 1. Two product shapes (we'll ship A first, B optional)

- **A. Platform store credit (recommended first).** Card is redeemable at *any*
  DoyinMart store. Simplest UX; platform holds the float and settles vendors via
  the existing payout system.
- **B. Store-scoped gift card.** Card only works at a specific vendor's store
  (`vendor_id` set). Nice for vendor branding, but complicates settlement (see §6).

Both share the same schema; `vendor_id = null` means platform-wide.

---

## 2. Core flows

**Buy a gift card**
1. Buyer picks an amount (preset tiers + custom), optional recipient email + message.
2. Pays via Paystack (server-derived amount — never trust the client, same rule as checkout).
3. On `charge.success` (webhook), we **issue** the card: generate code, set
   `balance = initial`, email the code to the recipient (or buyer).

**Redeem at checkout** (mirrors the coupon UX we already built)
1. Buyer enters a gift-card code in checkout.
2. Server validates (active, not expired, balance > 0, store match if scoped).
3. Apply up to `min(balance, orderTotal)`. **Partial redemption** allowed; any
   remainder is paid via Paystack. If the card covers 100%, skip the gateway
   (reuse the existing `finalCharge <= 0` free-issue path).
4. On success, **atomically** decrement the card balance and write a ledger row.

**(Optional) Load to wallet** — for signed-in users, redeeming can instead credit
an account `wallet.balance` (store credit) used automatically at checkout. Defer
to phase 2; the at-checkout-code flow works for guests too.

---

## 3. Schema (migration `0020_gift_cards.sql`)

```sql
do $$ begin create type gift_card_status as enum
  ('active','depleted','disabled','expired'); exception when duplicate_object then null; end $$;

create table gift_cards (
  id             uuid primary key default gen_random_uuid(),
  code           text unique not null,           -- high-entropy, formatted
  vendor_id      uuid references vendors(id) on delete cascade,  -- null = platform-wide
  initial_minor  integer not null,
  balance_minor  integer not null,
  currency       currency not null default 'NGN',
  status         gift_card_status not null default 'active',
  purchaser_email text,
  recipient_email text,
  message        text,
  purchase_order_id uuid references orders(id),   -- the order that bought it
  expires_at     timestamptz,
  created_at     timestamptz not null default now()
);
alter table gift_cards enable row level security;          -- service-role only
create index gift_cards_code_idx on gift_cards (code);

-- Immutable ledger: one row per redemption/adjustment (audit + partials).
create table gift_card_txns (
  id            uuid primary key default gen_random_uuid(),
  gift_card_id  uuid not null references gift_cards(id) on delete cascade,
  order_id      uuid references orders(id),
  amount_minor  integer not null,                 -- negative = redeem, positive = refund
  created_at    timestamptz not null default now()
);

-- Atomic redeem: succeeds only if enough balance, returns the debited amount.
create or replace function redeem_gift_card(p_code text, p_amount integer, p_order uuid)
returns integer language plpgsql as $$
declare debited integer;
begin
  update gift_cards
     set balance_minor = balance_minor - p_amount,
         status = case when balance_minor - p_amount <= 0 then 'depleted' else status end
   where code = p_code and status = 'active'
     and (expires_at is null or expires_at > now())
     and balance_minor >= p_amount
  returning p_amount into debited;
  if debited is not null then
    insert into gift_card_txns(gift_card_id, order_id, amount_minor)
      select id, p_order, -p_amount from gift_cards where code = p_code;
  end if;
  return coalesce(debited, 0);   -- 0 = couldn't redeem
end $$;
```

Order columns: `gift_card_code text`, `gift_card_minor integer default 0`
(how much of the order was paid by gift card), like the coupon columns.

---

## 4. Files (reusing existing patterns)

- `lib/giftcards.ts` — `generateCode()` (crypto.randomBytes), `validateGiftCard()`,
  `redeemGiftCard()` (calls the RPC), `issueGiftCard()`, `listGiftCards()`,
  admin disable/refund. Mirrors `lib/coupons.ts`.
- `app/gift-cards/page.tsx` — buy a gift card (amount tiers + recipient).
- `app/checkout/[orderId]/` — add a "Gift card" field next to the coupon field;
  `previewGiftCard()` + apply in `startCheckout` (server-authoritative).
- Webhook + `issueLicenseForOrder`/a new `issueGiftCardForOrder` — issue the card
  on paid gift-card purchase; email the recipient (branded template + `esc()`).
- `app/account/page.tsx` — "My gift cards" (balances + history).
- `app/admin/gift-cards/` — issue manually, disable, refund, **liability report**
  (sum of outstanding `balance_minor` = money owed). New admin nav item.

---

## 5. Security (carry over every pentest lesson)

- **Code entropy:** `crypto.randomBytes`, 16+ chars, grouped (e.g. `GIFT-XXXX-XXXX-XXXX`).
- **Atomic redemption:** the `redeem_gift_card` RPC's `WHERE balance >= amount`
  prevents double-spend / races (same idea as the coupon `max_uses` fix).
- **Server-authoritative amounts:** never trust a client-sent value (checkout C1 rule).
- **Rate-limit** validate/redeem via `checkRateLimit` (enumeration defense); generic
  error messages (don't reveal "valid but empty" vs "invalid").
- **RLS:** `gift_cards`/`gift_card_txns` are service-role only.
- **No gift-card-with-gift-card loops** for the *purchase* of a card (prevents
  laundering / chargeback abuse). Refunds of gift-card-funded orders go back to the
  **card balance**, not Paystack.
- **Chargeback risk:** a buyer could redeem then dispute the card purchase. Mitigate
  with an optional short "clearing" hold before a newly bought card is redeemable,
  and admin disable.

---

## 6. The hard part — money/settlement (decide before building)

When a card is **bought**, the platform collects cash (a liability). When it's
**redeemed** at a store, the vendor must still get paid — but no new Paystack charge
happens at redemption, so Paystack's split can't route it.

Options:
- **Platform float + payout (recommended for A):** platform holds gift-card cash;
  on redemption the vendor's share accrues in the existing payout balance and the
  platform settles it via transfer. Track liability vs settled carefully.
- **Pre-split at purchase (only works for B, store-scoped):** split the gift-card
  purchase to the vendor's subaccount immediately; redemption is just "use your
  prepaid credit at that store." Simpler money, less flexible card.

Recommendation: **ship A (platform credit, float + payout)** first; add B later.

---

## 7. Phases

1. Schema + `lib/giftcards.ts` + atomic RPC.
2. Buy-a-gift-card page + Paystack purchase + issue/email on webhook.
3. Redeem at checkout (code field, partial, free-after-full) — reuse coupon UI.
4. Account "my gift cards" + ledger view.
5. Admin: issue/disable/refund + liability report (+ nav item).
6. Settlement accounting (vendor payout from float).
7. (Optional) wallet/store-credit model + store-scoped cards.

**Open questions for tomorrow:** platform-wide vs store-scoped first? preset
amounts? expiry policy? clearing-hold before redeemable?
