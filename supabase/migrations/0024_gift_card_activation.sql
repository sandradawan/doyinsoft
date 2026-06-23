-- Per-card activation token so a store can activate a printed card by scanning a
-- visible QR (separate from the sealed redeem code). Run after 0023.
alter table gift_cards add column if not exists activation_token text;
create unique index if not exists gift_cards_activation_token_idx
  on gift_cards (activation_token) where activation_token is not null;
