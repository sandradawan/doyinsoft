-- Physical gift cards: batch-printable cards that can be created "inactive"
-- (printed, not yet sold) and activated on distribution/sale. Run after 0022.

-- New status for printed-but-not-yet-live cards. (Must run outside a txn block.)
alter type gift_card_status add value if not exists 'inactive';

-- Group a print run so its cards can be listed/printed together.
alter table gift_cards add column if not exists batch_ref text;
create index if not exists gift_cards_batch_idx on gift_cards (batch_ref);
