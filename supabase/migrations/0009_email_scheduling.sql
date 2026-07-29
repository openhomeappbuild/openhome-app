-- Scheduled sends. A plain date (not timestamptz) on purpose: Vercel Cron on
-- the Hobby plan only runs once a day with up to a ~59min timing slop, so
-- promising exact time-of-day delivery would be dishonest — day-level
-- scheduling is what the infrastructure can actually guarantee.
alter table emails add column if not exists scheduled_for date;
