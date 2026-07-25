alter table emails add column if not exists opened_at timestamptz;
alter table emails add column if not exists last_opened_at timestamptz;
alter table emails add column if not exists open_count int not null default 0;
