-- Affiliate program + WhatsApp. Run after 0012.

alter table orders  add column if not exists affiliate_id uuid;
alter table vendors add column if not exists whatsapp     text;

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
