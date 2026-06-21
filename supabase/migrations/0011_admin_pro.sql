-- Admin pro: vendor suspension, order payment reference, audit log, settings.

alter table vendors add column if not exists suspended boolean not null default false;
alter table orders  add column if not exists reference text;

-- Audit log of admin actions (service-role writes/reads only).
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

-- Key/value platform settings (commission %, USD rate, …).
create table if not exists settings (
  key   text primary key,
  value text not null
);
alter table settings enable row level security;

insert into settings (key, value) values
  ('commission_percent', '15'),
  ('usd_to_ngn', '1600')
on conflict (key) do nothing;
