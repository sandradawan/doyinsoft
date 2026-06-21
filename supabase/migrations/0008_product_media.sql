-- Product images: app icon + screenshots. Run after 0007.
-- Images are small, so a PUBLIC bucket is fine (served via public URL).

alter table products add column if not exists icon_url    text;
alter table products add column if not exists screenshots text[] not null default '{}';

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update set public = true;
