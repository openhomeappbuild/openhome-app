-- Scheduling / follow-up tracking. Service-role only, same pattern as the
-- rest of the dashboard tables (no anon/authenticated RLS policies —
-- nothing here is meant to be reachable with the public anon key).

create table if not exists follow_ups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  contact_email text not null,
  contact_name text,
  type text not null default 'call' check (type in ('call', 'email')),
  status text not null default 'outstanding' check (status in ('outstanding', 'done')),
  reason text,
  listing_id uuid references listings(id) on delete set null,
  due_date date not null default current_date,
  completed_at timestamptz
);

create index if not exists follow_ups_due_date_idx on follow_ups(due_date);
create index if not exists follow_ups_contact_email_idx on follow_ups(contact_email);
create index if not exists follow_ups_status_idx on follow_ups(status);

alter table follow_ups enable row level security;
