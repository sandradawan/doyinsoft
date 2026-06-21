-- Categories managed by admin; products reference them by name (free text +
-- guided by this list). Run after 0011.

create table if not exists categories (
  id         uuid primary key default gen_random_uuid(),
  name       text unique not null,
  created_at timestamptz not null default now()
);
alter table categories enable row level security;

create policy "categories public read" on categories for select using (true);

insert into categories (name) values
  ('Design tools'), ('Support'), ('Logistics'), ('Finance'), ('Commerce'),
  ('Productivity'), ('Developer tools'), ('Security'), ('Education'), ('Media')
on conflict (name) do nothing;
