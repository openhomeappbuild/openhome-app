alter table listings add column if not exists vendor_name text;
alter table listings add column if not exists vendor_email text;
alter table listings add column if not exists description_notes text;
alter table listings add column if not exists area_notes text;

create table if not exists emails (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  listing_id uuid not null references listings(id) on delete cascade,
  type text not null,
  open_home_day text not null,
  recipient_email text not null,
  recipient_name text,
  subject text not null,
  body_html text not null,
  status text not null default 'draft',
  error text
);

create index if not exists emails_listing_id_idx on emails(listing_id);
create index if not exists emails_batch_idx on emails(listing_id, open_home_day, type);

alter table emails enable row level security;
