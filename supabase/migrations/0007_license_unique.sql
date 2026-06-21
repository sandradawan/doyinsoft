-- One license per order — makes issuance idempotent and prevents duplicate
-- keys if both the webhook and the success page try to issue at once.
create unique index if not exists licenses_order_unique on licenses (order_id);
