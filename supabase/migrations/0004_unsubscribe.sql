create table if not exists unsubscribed_emails (
  email text primary key,
  created_at timestamptz not null default now()
);

alter table unsubscribed_emails enable row level security;
