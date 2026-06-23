-- Gift card visual theme (birthday, festive, etc.). Run after 0020.
alter table gift_cards add column if not exists design text not null default 'classic';
