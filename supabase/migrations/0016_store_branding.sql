-- Store branding: vendor bio + cover image.
alter table vendors add column if not exists bio       text;
alter table vendors add column if not exists cover_url text;
