-- Wishlist / saved products. Run after 0024.
create table if not exists wishlists (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null,
  product_id uuid not null references products (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);
alter table wishlists enable row level security;
create index if not exists wishlists_user_idx on wishlists (user_id);

-- Each user manages only their own wishlist.
drop policy if exists "users read own wishlist" on wishlists;
create policy "users read own wishlist" on wishlists for select
  to authenticated using (user_id = auth.uid());
drop policy if exists "users add own wishlist" on wishlists;
create policy "users add own wishlist" on wishlists for insert
  to authenticated with check (user_id = auth.uid());
drop policy if exists "users remove own wishlist" on wishlists;
create policy "users remove own wishlist" on wishlists for delete
  to authenticated using (user_id = auth.uid());
