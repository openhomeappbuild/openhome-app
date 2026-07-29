-- Vendor report feature: the enquiry/feedback CRM log plus a couple of
-- listing fields needed for the report cover (photo, public listing link).
-- Same pattern as the rest of the dashboard tables — service-role only,
-- nothing here is meant to be reachable with the public anon key.

alter table listings add column if not exists photo_storage_path text;
alter table listings add column if not exists listing_url text;

create table if not exists enquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  listing_id uuid not null references listings(id) on delete cascade,
  contact_date date not null default current_date,
  name text not null,
  source text,
  comment text,
  price_feedback text,
  interest_status text not null default 'unsure' check (interest_status in ('interested', 'not_interested', 'unsure')),
  inspected boolean not null default true,
  -- Set when this row was auto-seeded from a checkin, so re-syncing never
  -- creates a duplicate row for the same attendee visit.
  checkin_id uuid references checkins(id) on delete set null
);

create index if not exists enquiries_listing_id_idx on enquiries(listing_id);
create unique index if not exists enquiries_checkin_id_key on enquiries(checkin_id) where checkin_id is not null;

alter table enquiries enable row level security;
