-- Open the marketplace beyond software: product types + physical fulfilment.
-- Fully additive — existing products default to 'digital'. Run after 0015.

do $$ begin
  create type product_type as enum ('digital', 'physical', 'service');
exception when duplicate_object then null; end $$;

alter table products add column if not exists product_type product_type not null default 'digital';

-- Fulfilment + shipping for physical/service orders (null for digital).
alter table orders add column if not exists fulfilment_status text;
alter table orders add column if not exists shipping_name     text;
alter table orders add column if not exists shipping_phone    text;
alter table orders add column if not exists shipping_address  text;
alter table orders add column if not exists buyer_email       text;

-- Lifestyle categories for a broader marketplace.
insert into categories (name) values
  ('Fashion'), ('Gadgets'), ('Beauty'), ('Food'), ('Art & prints'),
  ('Music'), ('E-books'), ('Courses'), ('Templates'), ('Services')
on conflict (name) do nothing;
