-- In-app notifications (no push yet). Run after 0025.
create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid,
  email      text,                  -- recipient by email (buyers may be guests)
  type       text not null,         -- order | gift | launch | affiliate | system
  title      text not null,
  body       text,
  link       text,                  -- in-app path / deep link
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
alter table notifications enable row level security; -- read via service-role API
create index if not exists notifications_email_idx on notifications (email, created_at desc);
create index if not exists notifications_user_idx on notifications (user_id, created_at desc);
