-- Software files, versions, and license issuance.
-- Run after 0001_init.sql (and seed.sql if you want sample data).

-- ---- Product file + version columns -----------------------------------------
alter table products add column if not exists file_path      text;
alter table products add column if not exists file_name      text;
alter table products add column if not exists file_size      bigint;
alter table products add column if not exists version        text not null default '1.0.0';
alter table products add column if not exists download_count integer not null default 0;

-- ---- Licenses: link to product + buyer email + status -----------------------
alter table licenses add column if not exists product_id uuid references products (id) on delete set null;
alter table licenses add column if not exists email      text;
alter table licenses add column if not exists status     text not null default 'active'; -- active | revoked
create index if not exists licenses_email_idx on licenses (email);
create index if not exists licenses_key_idx   on licenses (key);

-- ---- Private Storage bucket for the actual software binaries -----------------
insert into storage.buckets (id, name, public)
values ('software', 'software', false)
on conflict (id) do nothing;

-- A vendor may upload only into their own folder: software/{vendor_id}/...
-- (the server action prefixes every path with the vendor id).
create policy "vendor uploads own software" on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'software'
    and exists (
      select 1 from vendors v
      where v.owner = auth.uid()
      and (storage.foldername(name))[1] = v.id::text
    )
  );

create policy "vendor reads own software" on storage.objects for select
  to authenticated
  using (
    bucket_id = 'software'
    and exists (
      select 1 from vendors v
      where v.owner = auth.uid()
      and (storage.foldername(name))[1] = v.id::text
    )
  );

-- Buyers never read the bucket directly. The server mints a short-lived signed
-- URL with the service role after verifying the license — so no public access
-- policy is granted here, by design.

-- ---- License issuance + atomic download counter -----------------------------
create or replace function increment_download(p_product_id uuid)
returns void language sql as $$
  update products set download_count = download_count + 1 where id = p_product_id;
$$;

-- Backfill a version for existing seed rows.
update products set version = '1.0.0' where version is null;
