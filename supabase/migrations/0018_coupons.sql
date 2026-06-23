-- Coupons / discount codes. Run after 0017.
do $$ begin
  create type discount_type as enum ('percent', 'fixed');
exception when duplicate_object then null; end $$;

create table if not exists coupons (
  id             uuid primary key default gen_random_uuid(),
  code           text unique not null,
  vendor_id      uuid references vendors (id) on delete cascade, -- null = platform-wide
  discount_type  discount_type not null default 'percent',
  discount_value integer not null,           -- percent (1-100) or fixed NGN kobo
  active         boolean not null default true,
  max_uses       integer,                    -- null = unlimited
  used_count     integer not null default 0,
  expires_at     timestamptz,
  created_at     timestamptz not null default now()
);
alter table coupons enable row level security;
create index if not exists coupons_code_lower_idx on coupons (lower(code));
create index if not exists coupons_vendor_idx on coupons (vendor_id);

-- Discount applied to an order.
alter table orders add column if not exists coupon_code    text;
alter table orders add column if not exists discount_minor integer not null default 0;

-- Atomic usage counter.
create or replace function increment_coupon_use(p_code text)
returns void language sql as $$
  update coupons set used_count = used_count + 1 where lower(code) = lower(p_code);
$$;
