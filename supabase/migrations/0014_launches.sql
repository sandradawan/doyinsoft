-- Launches board (Product Hunt-style) with upvotes. Run after 0013.

alter table products add column if not exists launched_at timestamptz;
alter table products add column if not exists upvotes     integer not null default 0;

create table if not exists upvotes (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  voter      text not null,
  created_at timestamptz not null default now(),
  unique (product_id, voter)
);
alter table upvotes enable row level security;
create index if not exists upvotes_product_idx on upvotes (product_id);

-- Existing approved products count as already launched.
update products set launched_at = coalesce(launched_at, created_at) where status = 'approved';
