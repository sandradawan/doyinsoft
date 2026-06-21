-- Payouts: vendor withdrawal details + payout history. Run after 0003.

-- Bank/withdrawal details on the vendor profile.
alter table vendors add column if not exists payout_bank           text;
alter table vendors add column if not exists payout_account_name   text;
alter table vendors add column if not exists payout_account_number text;

do $$ begin
  create type payout_status as enum ('requested', 'paid', 'failed');
exception when duplicate_object then null; end $$;

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

create index if not exists payouts_vendor_idx on payouts (vendor_id);

alter table payouts enable row level security;

-- A vendor sees and requests only their own payouts.
create policy "vendor reads own payouts" on payouts for select
  using (exists (select 1 from vendors v where v.id = payouts.vendor_id and v.owner = auth.uid()));

create policy "vendor requests own payouts" on payouts for insert
  to authenticated
  with check (exists (select 1 from vendors v where v.id = payouts.vendor_id and v.owner = auth.uid()));
