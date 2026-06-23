-- ============================================================================
-- DoyinSoft — complete database setup (single file)
-- ----------------------------------------------------------------------------
-- Paste this whole file into the Supabase SQL editor and click Run.
-- It creates every table, type, index, function, trigger, RLS policy, the
-- private storage bucket, and seed data the app needs. Safe to re-run.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
do $$ begin create type platform as enum ('desktop','mobile','web','free'); exception when duplicate_object then null; end $$;
do $$ begin create type currency as enum ('NGN','USD'); exception when duplicate_object then null; end $$;
do $$ begin create type order_status as enum ('paid','pending','refunded'); exception when duplicate_object then null; end $$;
do $$ begin create type gateway as enum ('paystack','flutterwave','stripe'); exception when duplicate_object then null; end $$;
do $$ begin create type payout_status as enum ('requested','paid','failed'); exception when duplicate_object then null; end $$;
do $$ begin create type product_status as enum ('pending','approved','rejected'); exception when duplicate_object then null; end $$;
do $$ begin create type discount_type as enum ('percent','fixed'); exception when duplicate_object then null; end $$;
do $$ begin create type product_type as enum ('digital','physical','service'); exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------
create table if not exists vendors (
  id                     uuid primary key default gen_random_uuid(),
  slug                   text unique not null,
  name                   text not null,
  initials               text not null,
  verified               boolean not null default false,
  owner                  uuid references auth.users (id) on delete set null,
  payout_bank            text,
  payout_bank_code       text,
  payout_account_name    text,
  payout_account_number  text,
  subaccount_code        text,
  suspended              boolean not null default false,
  created_at             timestamptz not null default now()
);
-- For databases created before these columns existed:
alter table vendors add column if not exists payout_bank_code text;
alter table vendors add column if not exists subaccount_code  text;
alter table vendors add column if not exists suspended        boolean not null default false;

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
  version             text not null default '1.0.0',
  file_path           text,
  file_name           text,
  file_size           bigint,
  download_count      integer not null default 0,
  rating_avg          numeric(2,1) not null default 0,
  rating_count        integer not null default 0,
  icon_url            text,
  screenshots         text[] not null default '{}',
  status              product_status not null default 'pending',
  featured            boolean not null default false,
  rejection_reason    text,
  launched_at         timestamptz,
  upvotes             integer not null default 0,
  product_type        product_type not null default 'digital',
  created_at          timestamptz not null default now()
);
-- For databases created before these columns existed:
alter table products add column if not exists product_type     product_type not null default 'digital';
alter table products add column if not exists icon_url         text;
alter table products add column if not exists screenshots      text[] not null default '{}';
alter table products add column if not exists status           product_status not null default 'pending';
alter table products add column if not exists featured         boolean not null default false;
alter table products add column if not exists rejection_reason text;
alter table products add column if not exists launched_at      timestamptz;
alter table products add column if not exists upvotes          integer not null default 0;

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

alter table orders add column if not exists reference text;
alter table orders add column if not exists affiliate_id uuid;
alter table orders add column if not exists fulfilment_status text;
alter table orders add column if not exists shipping_name     text;
alter table orders add column if not exists shipping_phone    text;
alter table orders add column if not exists shipping_address  text;
alter table orders add column if not exists buyer_email       text;

create table if not exists licenses (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references orders (id) on delete cascade,
  product_id uuid references products (id) on delete set null,
  key        text not null unique,
  email      text,
  status     text not null default 'active',
  issued_at  timestamptz not null default now()
);

create table if not exists payouts (
  id           uuid primary key default gen_random_uuid(),
  vendor_id    uuid not null references vendors (id) on delete cascade,
  amount_minor integer not null,
  currency     currency not null default 'NGN',
  status       payout_status not null default 'requested',
  method       text not null default 'Bank transfer',
  reference    text,
  created_at   timestamptz not null default now(),
  paid_at      timestamptz
);

create table if not exists reviews (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products (id) on delete cascade,
  user_id     uuid,
  author_name text not null default 'Anonymous',
  rating      smallint not null check (rating between 1 and 5),
  body        text not null default '',
  created_at  timestamptz not null default now()
);
alter table reviews add column if not exists user_id uuid;
-- Non-partial so it's a valid ON CONFLICT target for the review upsert.
create unique index if not exists reviews_product_user_uniq
  on reviews (product_id, user_id);

-- One outstanding payout request per recipient (atomic double-spend guard).
create unique index if not exists payouts_one_pending
  on payouts (vendor_id) where status = 'requested';

-- ----------------------------------------------------------------------------
-- Indexes
-- ----------------------------------------------------------------------------
create index if not exists products_vendor_idx on products (vendor_id);
create index if not exists orders_vendor_idx    on orders (vendor_id);
create index if not exists licenses_email_idx   on licenses (email);
create index if not exists licenses_key_idx     on licenses (key);
create unique index if not exists licenses_order_unique on licenses (order_id);
create index if not exists payouts_vendor_idx   on payouts (vendor_id);
create index if not exists reviews_product_idx  on reviews (product_id);
create unique index if not exists vendors_owner_unique on vendors (owner) where owner is not null;

-- ----------------------------------------------------------------------------
-- Functions & triggers
-- ----------------------------------------------------------------------------

-- 30-day vendor dashboard metrics.
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

-- Atomic download counter.
create or replace function increment_download(p_product_id uuid)
returns void language sql as $$
  update products set download_count = download_count + 1 where id = p_product_id;
$$;

-- Keep products.rating_avg / rating_count in sync with reviews.
create or replace function recompute_product_rating(pid uuid)
returns void language sql as $$
  update products set
    rating_count = (select count(*) from reviews where product_id = pid),
    rating_avg = coalesce((select round(avg(rating)::numeric, 1) from reviews where product_id = pid), 0)
  where id = pid;
$$;

create or replace function reviews_after_change()
returns trigger language plpgsql as $$
begin
  perform recompute_product_rating(coalesce(new.product_id, old.product_id));
  return null;
end;
$$;

drop trigger if exists reviews_aggregate on reviews;
create trigger reviews_aggregate
  after insert or update or delete on reviews
  for each row execute function reviews_after_change();

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
alter table vendors  enable row level security;
alter table products enable row level security;
alter table orders   enable row level security;
alter table licenses enable row level security;
alter table payouts  enable row level security;
alter table reviews  enable row level security;

-- Storefront is public.
drop policy if exists "vendors are public"  on vendors;
create policy "vendors are public"  on vendors  for select using (true);

drop policy if exists "products are public" on products;
create policy "products are public" on products for select using (true);

-- A user creates / manages exactly one vendor profile they own.
drop policy if exists "users create own vendor" on vendors;
create policy "users create own vendor" on vendors for insert
  to authenticated with check (owner = auth.uid());

drop policy if exists "users update own vendor" on vendors;
create policy "users update own vendor" on vendors for update
  to authenticated using (owner = auth.uid()) with check (owner = auth.uid());

-- A vendor manages only their own products.
drop policy if exists "vendor manages own products" on products;
create policy "vendor manages own products" on products for all
  using (exists (select 1 from vendors v where v.id = products.vendor_id and v.owner = auth.uid()))
  with check (exists (select 1 from vendors v where v.id = products.vendor_id and v.owner = auth.uid()));

-- A vendor reads only their own orders.
drop policy if exists "vendor reads own orders" on orders;
create policy "vendor reads own orders" on orders for select
  using (exists (select 1 from vendors v where v.id = orders.vendor_id and v.owner = auth.uid()));

-- A vendor reads and requests only their own payouts.
drop policy if exists "vendor reads own payouts" on payouts;
create policy "vendor reads own payouts" on payouts for select
  using (exists (select 1 from vendors v where v.id = payouts.vendor_id and v.owner = auth.uid()));

drop policy if exists "vendor requests own payouts" on payouts;
create policy "vendor requests own payouts" on payouts for insert
  to authenticated
  with check (exists (select 1 from vendors v where v.id = payouts.vendor_id and v.owner = auth.uid()));

-- Reviews: public read; anyone can post a valid review (no buyer auth yet).
drop policy if exists "reviews are public" on reviews;
create policy "reviews are public" on reviews for select using (true);

-- Reviews: only a signed-in user may insert a review attributed to themselves
-- (the old "anyone can review" policy let the public anon key spoof reviews).
drop policy if exists "anyone can review" on reviews;
drop policy if exists "buyers insert own review" on reviews;
create policy "buyers insert own review" on reviews for insert
  to authenticated with check (user_id = auth.uid() and rating between 1 and 5);

-- Note: `licenses` has RLS enabled with no policy on purpose — all license
-- reads/writes go through the server's service-role client after the app has
-- verified entitlement, so it is never exposed to anon/authenticated roles.

-- Admin audit log + platform settings (service-role only).
create table if not exists admin_audit (
  id          uuid primary key default gen_random_uuid(),
  admin_email text not null,
  action      text not null,
  target_type text,
  target_id   text,
  detail      text,
  created_at  timestamptz not null default now()
);
alter table admin_audit enable row level security;

create table if not exists settings (
  key   text primary key,
  value text not null
);
alter table settings enable row level security;
insert into settings (key, value) values
  ('commission_percent', '15'),
  ('usd_to_ngn', '1600')
on conflict (key) do nothing;

create table if not exists categories (
  id         uuid primary key default gen_random_uuid(),
  name       text unique not null,
  created_at timestamptz not null default now()
);
alter table categories enable row level security;
drop policy if exists "categories public read" on categories;
create policy "categories public read" on categories for select using (true);
insert into categories (name) values
  ('Design tools'), ('Support'), ('Logistics'), ('Finance'), ('Commerce'),
  ('Productivity'), ('Developer tools'), ('Security'), ('Education'), ('Media'),
  ('Fashion'), ('Gadgets'), ('Beauty'), ('Food'), ('Art & prints'),
  ('Music'), ('E-books'), ('Courses'), ('Templates'), ('Services')
on conflict (name) do nothing;

-- Affiliate program + WhatsApp.
alter table vendors add column if not exists whatsapp text;

-- Store branding.
alter table vendors add column if not exists bio       text;
alter table vendors add column if not exists cover_url text;

-- Coupons / discount codes.
create table if not exists coupons (
  id             uuid primary key default gen_random_uuid(),
  code           text unique not null,
  vendor_id      uuid references vendors (id) on delete cascade,
  discount_type  discount_type not null default 'percent',
  discount_value integer not null,
  active         boolean not null default true,
  max_uses       integer,
  used_count     integer not null default 0,
  expires_at     timestamptz,
  created_at     timestamptz not null default now()
);
alter table coupons enable row level security;
create index if not exists coupons_code_lower_idx on coupons (lower(code));
create index if not exists coupons_vendor_idx on coupons (vendor_id);
alter table orders add column if not exists coupon_code    text;
alter table orders add column if not exists discount_minor integer not null default 0;
-- Atomic + cap-aware: never lets used_count exceed max_uses under concurrency.
create or replace function increment_coupon_use(p_code text)
returns void language sql as $$
  update coupons set used_count = used_count + 1
  where lower(code) = lower(p_code)
    and (max_uses is null or used_count < max_uses);
$$;

-- Follow a seller.
create table if not exists follows (
  id         uuid primary key default gen_random_uuid(),
  vendor_id  uuid not null references vendors (id) on delete cascade,
  user_id    uuid references auth.users (id) on delete cascade,
  email      text,
  created_at timestamptz not null default now(),
  unique (vendor_id, user_id)
);
alter table follows enable row level security;
create index if not exists follows_vendor_idx on follows (vendor_id);

create table if not exists affiliates (
  id         uuid primary key default gen_random_uuid(),
  code       text unique not null,
  owner      uuid references auth.users (id) on delete set null,
  email      text,
  created_at timestamptz not null default now()
);
alter table affiliates enable row level security;
create unique index if not exists affiliates_owner_unique on affiliates (owner) where owner is not null;

create table if not exists referrals (
  id           uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references affiliates (id) on delete cascade,
  order_id     uuid references orders (id) on delete set null,
  amount_minor integer not null default 0,
  created_at   timestamptz not null default now()
);
alter table referrals enable row level security;
create unique index if not exists referrals_order_unique on referrals (order_id);

insert into settings (key, value) values ('affiliate_percent', '10')
on conflict (key) do nothing;

alter table affiliates add column if not exists bank_code      text;
alter table affiliates add column if not exists account_name   text;
alter table affiliates add column if not exists account_number text;

create table if not exists affiliate_payouts (
  id           uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references affiliates (id) on delete cascade,
  amount_minor integer not null,
  status       text not null default 'requested',
  created_at   timestamptz not null default now(),
  paid_at      timestamptz
);
alter table affiliate_payouts enable row level security;
create index if not exists affiliate_payouts_aff_idx on affiliate_payouts (affiliate_id);
-- One outstanding payout request per affiliate (atomic double-spend guard).
create unique index if not exists affiliate_payouts_one_pending
  on affiliate_payouts (affiliate_id) where status = 'requested';

-- ----------------------------------------------------------------------------
-- Storage: private bucket for software binaries
-- ----------------------------------------------------------------------------
-- Private bucket with a 700 MB per-file limit (700 * 1024 * 1024 bytes).
insert into storage.buckets (id, name, public, file_size_limit)
values ('software', 'software', false, 734003200)
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

-- Public bucket for product images (icons + screenshots).
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;

-- A vendor may upload only into their own folder: software/{vendor_id}/...
drop policy if exists "vendor uploads own software" on storage.objects;
create policy "vendor uploads own software" on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'software'
    and exists (
      select 1 from vendors v
      where v.owner = auth.uid()
      and (storage.foldername(name))[1] = v.id::text
    )
  );

drop policy if exists "vendor reads own software" on storage.objects;
create policy "vendor reads own software" on storage.objects for select
  to authenticated
  using (
    bucket_id = 'software'
    and exists (
      select 1 from vendors v
      where v.owner = auth.uid()
      and (storage.foldername(name))[1] = v.id::text
    )
  );
-- Buyers never read the bucket directly — the server mints short-lived signed
-- URLs with the service role after verifying the license.

-- ============================================================================
-- Seed data (sample storefront content). Idempotent.
-- ============================================================================
insert into vendors (id, slug, name, initials, verified) values
  ('11111111-1111-1111-1111-111111111111', 'studio-adeyemi', 'Studio Adeyemi', 'SA', true),
  ('22222222-2222-2222-2222-222222222222', 'doyintech',      'DoyinTech',      'DT', true),
  ('33333333-3333-3333-3333-333333333333', 'okoro-labs',     'Okoro Labs',     'OL', false)
on conflict (id) do nothing;

insert into products
  (slug, name, vendor_id, price_minor, currency, platform, category, tagline, description,
   system_requirements, os_badges, version, file_name, file_size, download_count, rating_avg, rating_count)
values
  ('vectorforge', 'VectorForge', '11111111-1111-1111-1111-111111111111', 1500000, 'NGN', 'desktop', 'Design tools',
   'Vector illustration, offline-first',
   'A vector illustration tool built for low-bandwidth workflows, with offline export and Yoruba-language UI.',
   'Windows 10+, 4GB RAM, 500MB disk', '{Windows,macOS}', '2.1.0', 'VectorForge-Setup-2.1.0.exe', 84934656, 312, 4.6, 38),
  ('pulsedesk', 'PulseDesk', '22222222-2222-2222-2222-222222222222', 2900, 'USD', 'web', 'Support',
   'Lightweight helpdesk for small teams',
   'A lightweight helpdesk and shared inbox for small teams, with SLA tracking and offline draft sync.',
   'Any modern browser, no install required', '{"Web app"}', '3.4.1', 'pulsedesk-selfhost-3.4.1.zip', 12582912, 87, 4.2, 11),
  ('fieldtrack', 'FieldTrack', '33333333-3333-3333-3333-333333333333', 0, 'NGN', 'mobile', 'Logistics',
   'Offline field data collection',
   'Collect field survey data offline on Android and sync when you regain signal. Built for rural deployments.',
   'Android 8.0+, 100MB storage', '{Android}', '1.6.2', 'fieldtrack-1.6.2.apk', 41943040, 1204, 4.8, 92),
  ('kobokeep', 'KoboKeep', '22222222-2222-2222-2222-222222222222', 800000, 'NGN', 'web', 'Finance',
   'Bookkeeping for informal traders',
   'Simple bookkeeping and daily cash reconciliation for market traders, with WhatsApp receipt capture.',
   'Any modern browser, works on 2G', '{"Web app"}', '2.0.0', 'kobokeep-2.0.0.zip', 9437184, 56, 4.0, 7),
  ('naijafonts', 'NaijaFonts', '11111111-1111-1111-1111-111111111111', 450000, 'NGN', 'desktop', 'Design tools',
   'Type family pack for African scripts',
   'A type family pack covering Latin, Yoruba and Hausa diacritics, licensed for commercial desktop use.',
   'Windows or macOS, any version', '{Windows,macOS}', '1.3.0', 'NaijaFonts-1.3.0.zip', 6291456, 143, 4.5, 19),
  ('marketmesh', 'MarketMesh', '33333333-3333-3333-3333-333333333333', 4900, 'USD', 'web', 'Commerce',
   'Storefront builder with offline cart',
   'Build a hosted storefront with an offline cart that queues orders during outages and syncs on reconnect.',
   'Any modern browser', '{"Web app"}', '0.9.4', 'marketmesh-0.9.4.zip', 15728640, 22, 3.8, 4)
on conflict (slug) do nothing;

-- Sample products are pre-approved + a couple featured for the hero.
update products set status = 'approved'
  where slug in ('vectorforge','pulsedesk','fieldtrack','kobokeep','naijafonts','marketmesh');
update products set featured = true where slug in ('vectorforge','fieldtrack');
update products set launched_at = coalesce(launched_at, now()) where status = 'approved';
update products set upvotes = rating_count where upvotes = 0;
create index if not exists products_status_idx on products (status);

create table if not exists upvotes (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  voter      text not null,
  created_at timestamptz not null default now(),
  unique (product_id, voter)
);
alter table upvotes enable row level security;
create index if not exists upvotes_product_idx on upvotes (product_id);

-- A few orders for Studio Adeyemi so a connected dashboard has sample data.
insert into orders (product_id, vendor_id, buyer_name, buyer_initials, amount_minor, currency, status, gateway)
select p.id, p.vendor_id, x.buyer_name, x.buyer_initials, x.amount_minor, 'NGN', x.status::order_status, x.gateway::gateway
from (values
  ('vectorforge', 'M. Bello', 'MB', 1500000, 'paid',    'paystack'),
  ('vectorforge', 'T. Okafor','TO', 1500000, 'paid',    'paystack'),
  ('naijafonts',  'A. Eze',   'AE',  450000, 'paid',    'flutterwave'),
  ('vectorforge', 'F. Lawal', 'FL', 1500000, 'pending', 'paystack')
) as x(slug, buyer_name, buyer_initials, amount_minor, status, gateway)
join products p on p.slug = x.slug
where not exists (
  select 1 from orders o where o.vendor_id = p.vendor_id
);

-- Sample reviews (the trigger recomputes rating_avg/rating_count afterward).
insert into reviews (product_id, author_name, rating, body)
select p.id, x.author_name, x.rating, x.body
from (values
  ('vectorforge', 'Chidi N.', 5, 'Offline export is a lifesaver on bad connections. The Yoruba UI is a lovely touch.'),
  ('vectorforge', 'Aisha B.', 4, 'Fast and lightweight. Would love more brush presets, but solid for the price.'),
  ('fieldtrack',  'Tunde O.', 5, 'We rolled this out to 40 field agents in rural areas. Sync just works.')
) as x(slug, author_name, rating, body)
join products p on p.slug = x.slug
where not exists (
  select 1 from reviews r where r.product_id = p.id
);

-- Done. Now put your Project URL + anon key + service_role key in .env.local.
