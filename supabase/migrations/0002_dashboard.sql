-- Agent dashboard: offers, documents, and a private storage bucket for document files.
-- No RLS policies are added for anon/authenticated here on purpose — this data (attendee
-- contact details already covered by 0001, plus offers and documents) is only ever read
-- via the service-role key from server-side dashboard code, which bypasses RLS entirely.
-- Nothing here is meant to be reachable with the public anon key.

create table if not exists offers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  listing_id uuid not null references listings(id) on delete cascade,
  buyer_name text not null,
  buyer_email text,
  amount numeric,
  conditions text,
  expiry timestamptz,
  status text not null default 'indicated'
);

create index if not exists offers_listing_id_idx on offers(listing_id);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  listing_id uuid not null references listings(id) on delete cascade,
  name text not null,
  category text not null default 'other',
  storage_path text not null,
  size_bytes bigint
);

create index if not exists documents_listing_id_idx on documents(listing_id);

alter table offers enable row level security;
alter table documents enable row level security;

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;
