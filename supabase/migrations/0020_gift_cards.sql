-- Gift cards: buy a stored-value code, redeem it at checkout. Run after 0019.

do $$ begin
  create type gift_card_status as enum ('active', 'depleted', 'disabled', 'expired');
exception when duplicate_object then null; end $$;

create table if not exists gift_cards (
  id                 uuid primary key default gen_random_uuid(),
  code               text unique not null,           -- high-entropy, formatted
  vendor_id          uuid references vendors (id) on delete cascade,  -- null = platform-wide
  initial_minor      integer not null,
  balance_minor      integer not null,
  currency           currency not null default 'NGN',
  status             gift_card_status not null default 'active',
  purchaser_email    text,
  recipient_email    text,
  message            text,
  purchase_reference text,                            -- Paystack ref of the purchase (idempotency)
  expires_at         timestamptz,
  created_at         timestamptz not null default now()
);
alter table gift_cards enable row level security;     -- service-role only
create index if not exists gift_cards_code_idx on gift_cards (code);
create unique index if not exists gift_cards_purchase_ref_idx
  on gift_cards (purchase_reference) where purchase_reference is not null;

-- Immutable ledger: one row per redemption (audit + idempotency per order).
create table if not exists gift_card_txns (
  id            uuid primary key default gen_random_uuid(),
  gift_card_id  uuid not null references gift_cards (id) on delete cascade,
  order_id      uuid references orders (id) on delete set null,
  amount_minor  integer not null,                     -- negative = redeem
  created_at    timestamptz not null default now()
);
alter table gift_card_txns enable row level security;
create unique index if not exists gift_card_txns_card_order_uniq
  on gift_card_txns (gift_card_id, order_id) where order_id is not null;

-- How much of an order was paid by gift card (the rest goes to Paystack).
alter table orders add column if not exists gift_card_code  text;
alter table orders add column if not exists gift_card_minor integer not null default 0;

-- Atomic, idempotent redeem. Returns the amount actually debited (0 = none/again).
create or replace function redeem_gift_card(p_code text, p_amount integer, p_order uuid)
returns integer language plpgsql as $$
declare v_id uuid; debited integer;
begin
  select id into v_id from gift_cards where code = p_code;
  if v_id is null or p_amount <= 0 then return 0; end if;
  -- Already redeemed for this order? Idempotent no-op.
  if p_order is not null and exists (
    select 1 from gift_card_txns where gift_card_id = v_id and order_id = p_order
  ) then
    return 0;
  end if;
  update gift_cards
     set balance_minor = balance_minor - p_amount,
         status = case when balance_minor - p_amount <= 0 then 'depleted' else status end
   where id = v_id and status = 'active'
     and (expires_at is null or expires_at > now())
     and balance_minor >= p_amount
  returning p_amount into debited;
  if debited is not null then
    insert into gift_card_txns (gift_card_id, order_id, amount_minor)
    values (v_id, p_order, -p_amount);
  end if;
  return coalesce(debited, 0);
end $$;
