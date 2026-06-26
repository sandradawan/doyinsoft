-- Scale: push the Stores aggregation into the database.
-- Previously getStoresWithDetails() fetched ALL approved products + ALL follows
-- and tallied per-vendor counts in JS — O(catalog size) per request. This RPC
-- does it in one indexed SQL pass instead. Fully additive; the app falls back to
-- the JS path until this is applied. Run after 0027.

create index if not exists products_vendor_status_idx on products (vendor_id, status);
create index if not exists follows_vendor_idx on follows (vendor_id);

-- One row per non-suspended vendor that has at least one approved product,
-- with product count, total downloads and follower count — already sorted for
-- the Stores grid. security definer so follower counts aggregate regardless of
-- the caller's RLS on follows.
create or replace function store_cards()
returns table (
  slug      text,
  name      text,
  initials  text,
  verified  boolean,
  products  bigint,
  downloads bigint,
  followers bigint,
  bio       text,
  cover_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    v.slug,
    v.name,
    v.initials,
    v.verified,
    count(p.id)                          as products,
    coalesce(sum(p.download_count), 0)   as downloads,
    coalesce(fc.followers, 0)            as followers,
    v.bio,
    v.cover_url
  from vendors v
  join products p
    on p.vendor_id = v.id and p.status = 'approved'
  left join (
    select vendor_id, count(*) as followers
    from follows
    group by vendor_id
  ) fc on fc.vendor_id = v.id
  where v.suspended = false
  group by v.id, v.slug, v.name, v.initials, v.verified, v.bio, v.cover_url, fc.followers
  order by followers desc, downloads desc;
$$;

grant execute on function store_cards() to anon, authenticated, service_role;
