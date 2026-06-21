-- Marketplace commission via Paystack split payments.
-- Each vendor gets a Paystack subaccount; the platform keeps a % of each sale
-- and Paystack settles the rest to the vendor's bank automatically.

alter table vendors add column if not exists subaccount_code  text;
alter table vendors add column if not exists payout_bank_code text;
