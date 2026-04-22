-- If fifa_rooms existed before ticket_counts, run once in Supabase SQL Editor:

alter table public.fifa_rooms add column if not exists ticket_counts jsonb not null default '{}'::jsonb;
