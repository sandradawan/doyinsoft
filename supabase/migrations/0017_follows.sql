-- Follow a seller → get notified of new products.
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
