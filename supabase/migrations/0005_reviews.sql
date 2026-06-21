-- Product reviews + ratings. Run after 0004.

alter table products add column if not exists rating_avg   numeric(2,1) not null default 0;
alter table products add column if not exists rating_count integer      not null default 0;

create table if not exists reviews (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products (id) on delete cascade,
  author_name text not null default 'Anonymous',
  rating      smallint not null check (rating between 1 and 5),
  body        text not null default '',
  created_at  timestamptz not null default now()
);

create index if not exists reviews_product_idx on reviews (product_id);

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
  after insert or delete on reviews
  for each row execute function reviews_after_change();

-- RLS: reviews are public to read; anyone can post a valid review (no buyer
-- auth yet). Tighten to verified purchasers once buyer accounts exist.
alter table reviews enable row level security;

create policy "reviews are public" on reviews for select using (true);
create policy "anyone can review" on reviews for insert
  with check (rating between 1 and 5);
