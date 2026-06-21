-- Product moderation (approval) + featured flag. Run after 0009.

do $$ begin
  create type product_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

alter table products add column if not exists status           product_status not null default 'pending';
alter table products add column if not exists featured         boolean not null default false;
alter table products add column if not exists rejection_reason text;

-- Approve everything that already exists so the storefront isn't emptied;
-- new products created after this will start as 'pending' for review.
update products set status = 'approved' where status = 'pending';

create index if not exists products_status_idx on products (status);
