-- DoyinMart schema. Run in the Supabase SQL editor (or via the CLI).
-- Mirrors lib/types.ts and lib/seed-data.ts.

create extension if not exists pgcrypto;

-- ---- Enums ------------------------------------------------------------------
do $$ begin
  create type platform as enum ('desktop', 'mobile', 'web', 'free');
exception when duplicate_object then null; end $$;

do $$ begin
  create type currency as enum ('NGN', 'USD');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status as enum ('paid', 'pending', 'refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type gateway as enum ('paystack', 'flutterwave', 'stripe');
exception when duplicate_object then null; end $$;

-- ---- Tables -----------------------------------------------------------------
create table if not exists vendors (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  name       text not null,
  initials   text not null,
  verified   boolean not null default false,
  -- owner links a vendor to an auth user (nullable for seed/demo vendors).
  owner      uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists products (
  id                  uuid primary key default gen_random_uuid(),
  slug                text unique not null,
  name                text not null,
  vendor_id           uuid not null references vendors (id) on delete cascade,
  price_minor         integer not null default 0,
  currency            currency not null default 'NGN',
  platform            platform not null default 'web',
  category            text not null default '',
  tagline             text not null default '',
  description         text not null default '',
  system_requirements text not null default '',
  os_badges           text[] not null default '{}',
  created_at          timestamptz not null default now()
);

create table if not exists orders (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references products (id) on delete restrict,
  vendor_id      uuid not null references vendors (id) on delete restrict,
  buyer_name     text not null default 'Guest',
  buyer_initials text not null default 'G',
  amount_minor   integer not null,
  currency       currency not null default 'NGN',
  status         order_status not null default 'pending',
  gateway        gateway not null default 'paystack',
  created_at     timestamptz not null default now()
);

create table if not exists licenses (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references orders (id) on delete cascade,
  key        text not null unique,
  issued_at  timestamptz not null default now()
);

create index if not exists products_vendor_idx on products (vendor_id);
create index if not exists orders_vendor_idx on orders (vendor_id);

-- ---- Dashboard metrics RPC ---------------------------------------------------
create or replace function vendor_metrics_30d(p_vendor_id uuid)
returns table (
  revenue_minor bigint,
  units_sold bigint,
  pending_payout_minor bigint,
  currency currency
)
language sql stable as $$
  select
    coalesce(sum(amount_minor) filter (where status = 'paid'
      and created_at >= now() - interval '30 days'), 0)        as revenue_minor,
    coalesce(count(*) filter (where status = 'paid'
      and created_at >= now() - interval '30 days'), 0)        as units_sold,
    coalesce(sum(amount_minor) filter (where status = 'pending'), 0) as pending_payout_minor,
    'NGN'::currency                                            as currency
  from orders
  where vendor_id = p_vendor_id;
$$;

-- ---- Row Level Security ------------------------------------------------------
alter table vendors  enable row level security;
alter table products enable row level security;
alter table orders   enable row level security;
alter table licenses enable row level security;

-- Storefront is public: anyone can read vendors and products.
create policy "vendors are public"  on vendors  for select using (true);
create policy "products are public" on products for select using (true);

-- A vendor can manage only their own products.
create policy "vendor manages own products" on products for all
  using (exists (select 1 from vendors v where v.id = products.vendor_id and v.owner = auth.uid()))
  with check (exists (select 1 from vendors v where v.id = products.vendor_id and v.owner = auth.uid()));

-- A vendor sees only their own orders; inserts come from the server action.
create policy "vendor reads own orders" on orders for select
  using (exists (select 1 from vendors v where v.id = orders.vendor_id and v.owner = auth.uid()));
