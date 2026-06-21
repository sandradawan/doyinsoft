-- Affiliate payouts (withdrawals). Run after 0014.

alter table affiliates add column if not exists bank_code      text;
alter table affiliates add column if not exists account_name   text;
alter table affiliates add column if not exists account_number text;

create table if not exists affiliate_payouts (
  id           uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references affiliates (id) on delete cascade,
  amount_minor integer not null,
  status       text not null default 'requested', -- requested | paid
  created_at   timestamptz not null default now(),
  paid_at      timestamptz
);
alter table affiliate_payouts enable row level security;
create index if not exists affiliate_payouts_aff_idx on affiliate_payouts (affiliate_id);
