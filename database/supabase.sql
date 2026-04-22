-- Run this once in Supabase: SQL Editor → New query → Run
-- Database lives on Supabase (hosted Postgres), not in git.

create table if not exists public.fifa_rooms (
  id text primary key,
  scores jsonb not null default '{}'::jsonb,
  comments jsonb not null default '{}'::jsonb,
  bought jsonb not null default '{}'::jsonb,
  ticket_counts jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists fifa_rooms_updated_at_idx on public.fifa_rooms (updated_at desc);

alter table public.fifa_rooms enable row level security;

-- Open read/write for anonymous API users. The app uses a single row id = 'global' for one shared board.
create policy "fifa_rooms_select" on public.fifa_rooms for select using (true);
create policy "fifa_rooms_insert" on public.fifa_rooms for insert with check (true);
create policy "fifa_rooms_update" on public.fifa_rooms for update using (true) with check (true);

grant select, insert, update on public.fifa_rooms to anon, authenticated;

-- Optional: enable Realtime for this table (ignore error if already added)
-- alter publication supabase_realtime add table public.fifa_rooms;
