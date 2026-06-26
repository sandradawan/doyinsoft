-- Push notifications: store each signed-in device's FCM token so the server can
-- push order/gift/launch alerts. Keyed by token (a device re-registers on each
-- launch). user_id + email let notify() match a recipient by either. Run after 0028.

create table if not exists device_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users (id) on delete cascade,
  email      text,
  token      text not null unique,
  platform   text not null default 'android',
  updated_at timestamptz not null default now()
);

create index if not exists device_tokens_user_idx  on device_tokens (user_id);
create index if not exists device_tokens_email_idx on device_tokens (email);

alter table device_tokens enable row level security;

-- A user manages only their own tokens (the API writes with the service role).
do $$ begin
  create policy "own device tokens" on device_tokens for all
    using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
