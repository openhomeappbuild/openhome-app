create table if not exists appraisals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  address text not null,
  suburb text,
  region text not null default 'Queenstown',
  legal_description text,
  title_reference text,
  floor_area_m2 numeric,
  land_area_m2 numeric,
  bedrooms int,
  bathrooms int,
  land_value numeric,
  improvements_value numeric,
  capital_value numeric,
  last_sold_date date,
  last_sold_price numeric,
  description text,
  vendor_name text,
  vendor_email text,
  status text not null default 'draft'
);

create table if not exists appraisal_comparables (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  appraisal_id uuid not null references appraisals(id) on delete cascade,
  address text not null,
  sale_date date,
  floor_area_m2 numeric,
  land_area_m2 numeric,
  bedrooms int,
  sale_price numeric not null,
  capital_value numeric,
  is_current_listing boolean not null default false,
  grade text not null default 'Similar',
  included boolean not null default true,
  flagged_reason text,
  indicated_value numeric not null,
  notes text
);

create index if not exists appraisal_comparables_appraisal_id_idx on appraisal_comparables(appraisal_id);

alter table appraisals enable row level security;
alter table appraisal_comparables enable row level security;
