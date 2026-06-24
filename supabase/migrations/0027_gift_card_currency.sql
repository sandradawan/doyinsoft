-- Gift cards can be denominated in NGN or USD. An order stores BOTH the NGN value
-- a card covered (gift_card_minor, for the Paystack net) and the amount to debit
-- from the card in ITS currency (gift_card_debit_minor). Run after 0026.
alter table orders add column if not exists gift_card_debit_minor integer not null default 0;
