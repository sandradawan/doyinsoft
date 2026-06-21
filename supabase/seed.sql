-- Seed data matching lib/seed-data.ts. Run after 0001_init.sql.
-- Uses fixed UUIDs so re-running is idempotent.

insert into vendors (id, slug, name, initials, verified) values
  ('11111111-1111-1111-1111-111111111111', 'studio-adeyemi', 'Studio Adeyemi', 'SA', true),
  ('22222222-2222-2222-2222-222222222222', 'doyintech',      'DoyinTech',      'DT', true),
  ('33333333-3333-3333-3333-333333333333', 'okoro-labs',     'Okoro Labs',     'OL', false)
on conflict (id) do nothing;

insert into products
  (slug, name, vendor_id, price_minor, currency, platform, category, tagline, description, system_requirements, os_badges)
values
  ('vectorforge', 'VectorForge', '11111111-1111-1111-1111-111111111111', 1500000, 'NGN', 'desktop', 'Design tools',
   'Vector illustration, offline-first',
   'A vector illustration tool built for low-bandwidth workflows, with offline export and Yoruba-language UI.',
   'Windows 10+, 4GB RAM, 500MB disk', '{Windows,macOS}'),
  ('pulsedesk', 'PulseDesk', '22222222-2222-2222-2222-222222222222', 2900, 'USD', 'web', 'Support',
   'Lightweight helpdesk for small teams',
   'A lightweight helpdesk and shared inbox for small teams, with SLA tracking and offline draft sync.',
   'Any modern browser, no install required', '{"Web app"}'),
  ('fieldtrack', 'FieldTrack', '33333333-3333-3333-3333-333333333333', 0, 'NGN', 'mobile', 'Logistics',
   'Offline field data collection',
   'Collect field survey data offline on Android and sync when you regain signal. Built for rural deployments.',
   'Android 8.0+, 100MB storage', '{Android}'),
  ('kobokeep', 'KoboKeep', '22222222-2222-2222-2222-222222222222', 800000, 'NGN', 'web', 'Finance',
   'Bookkeeping for informal traders',
   'Simple bookkeeping and daily cash reconciliation for market traders, with WhatsApp receipt capture.',
   'Any modern browser, works on 2G', '{"Web app"}'),
  ('naijafonts', 'NaijaFonts', '11111111-1111-1111-1111-111111111111', 450000, 'NGN', 'desktop', 'Design tools',
   'Type family pack for African scripts',
   'A type family pack covering Latin, Yoruba and Hausa diacritics, licensed for commercial desktop use.',
   'Windows or macOS, any version', '{Windows,macOS}'),
  ('marketmesh', 'MarketMesh', '33333333-3333-3333-3333-333333333333', 4900, 'USD', 'web', 'Commerce',
   'Storefront builder with offline cart',
   'Build a hosted storefront with an offline cart that queues orders during outages and syncs on reconnect.',
   'Any modern browser', '{"Web app"}')
on conflict (slug) do nothing;

-- A few paid + pending orders for Studio Adeyemi so the dashboard has data.
insert into orders (product_id, vendor_id, buyer_name, buyer_initials, amount_minor, currency, status, gateway)
select p.id, p.vendor_id, x.buyer_name, x.buyer_initials, x.amount_minor, 'NGN', x.status::order_status, x.gateway::gateway
from (values
  ('vectorforge', 'M. Bello', 'MB', 1500000, 'paid',    'paystack'),
  ('vectorforge', 'T. Okafor','TO', 1500000, 'paid',    'paystack'),
  ('naijafonts',  'A. Eze',   'AE',  450000, 'paid',    'flutterwave'),
  ('vectorforge', 'F. Lawal', 'FL', 1500000, 'pending', 'paystack')
) as x(slug, buyer_name, buyer_initials, amount_minor, status, gateway)
join products p on p.slug = x.slug;
