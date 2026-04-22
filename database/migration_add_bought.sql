-- If you already ran database/supabase.sql before the "bought" column existed, run this once:

alter table public.fifa_rooms add column if not exists bought jsonb not null default '{}'::jsonb;
