-- Security hardening (pentest remediation). Run after 0018.

-- H4: one review per buyer per product; store the reviewer's identity.
alter table reviews add column if not exists user_id uuid;
-- Non-partial so it's a valid ON CONFLICT target for the upsert. NULL user_ids
-- (legacy/demo rows) are treated as distinct, so they don't collide.
create unique index if not exists reviews_product_user_uniq
  on reviews (product_id, user_id);
-- Replace the over-permissive anon insert policy (anyone could spoof reviews via
-- the public anon key) with one that only lets a signed-in user insert a review
-- attributed to themselves. The server action still enforces verified purchase.
drop policy if exists "anyone can review" on reviews;
drop policy if exists "buyers insert own review" on reviews;
create policy "buyers insert own review" on reviews for insert
  to authenticated with check (user_id = auth.uid() and rating between 1 and 5);
-- Reviews are now upserted (a buyer can edit their review), so the rating
-- aggregate must also recompute on UPDATE, not just insert/delete.
drop trigger if exists reviews_aggregate on reviews;
create trigger reviews_aggregate
  after insert or update or delete on reviews
  for each row execute function reviews_after_change();

-- H5: one upvote per authenticated user per product (voter now holds user id).
create unique index if not exists upvotes_product_voter_uniq
  on upvotes (product_id, voter);

-- M4: forbid more than one outstanding (requested) payout per recipient.
create unique index if not exists affiliate_payouts_one_pending
  on affiliate_payouts (affiliate_id) where status = 'requested';
create unique index if not exists payouts_one_pending
  on payouts (vendor_id) where status = 'requested';

-- M1: make coupon redemption atomic and cap-aware (never exceed max_uses).
create or replace function increment_coupon_use(p_code text)
returns void language sql as $$
  update coupons set used_count = used_count + 1
  where lower(code) = lower(p_code)
    and (max_uses is null or used_count < max_uses);
$$;
