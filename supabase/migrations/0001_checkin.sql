-- Open home check-in: listings + attendee sign-ins.
-- RLS: anon can read listings (needed to render the public check-in page) and
-- insert checkins (the public sign-in form), but cannot read checkins back —
-- attendee data is only exposed via the agent dashboard (service role / future auth).

create table if not exists listings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  address text not null,
  suburb text not null,
  region text not null default 'Queenstown',
  postcode text,
  bedrooms int,
  bathrooms int,
  car_spaces int,
  sale_method text,
  sale_method_date date,
  open_home_start timestamptz,
  open_home_end timestamptz,
  agent_name text not null default 'Chris Campbell',
  agent_phone text not null default '021 932 441',
  agent_email text not null default 'chris.campbell@bayleys.co.nz',
  status text not null default 'active'
);

create table if not exists checkins (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  listing_id uuid not null references listings(id) on delete cascade,
  full_name text not null,
  mobile text not null,
  email text not null,
  is_local boolean not null,
  suburb text,
  interest text not null,
  consent boolean not null default false
);

create index if not exists checkins_listing_id_idx on checkins(listing_id);

alter table listings enable row level security;
alter table checkins enable row level security;

drop policy if exists "listings are publicly readable" on listings;
create policy "listings are publicly readable"
  on listings for select
  to anon
  using (status = 'active');

drop policy if exists "anyone can check in" on checkins;
create policy "anyone can check in"
  on checkins for insert
  to anon
  with check (true);

-- Seed the demo listing used by the prototype so the check-in page has
-- something real to render out of the box.
insert into listings (
  address, suburb, region, postcode, bedrooms, bathrooms, car_spaces,
  sale_method, sale_method_date, open_home_start, open_home_end
)
select
  '15 Stonebrook Drive', 'Lake Hayes Estate', 'Queenstown', '9304', 4, 2, 2,
  'Deadline sale', '2026-08-14',
  (current_date + time '13:00')::timestamptz,
  (current_date + time '13:30')::timestamptz
where not exists (select 1 from listings where address = '15 Stonebrook Drive');
