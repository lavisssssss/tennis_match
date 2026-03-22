-- Phase 7: Elo / 전적 (Supabase SQL Editor에서 실행)
create extension if not exists "pgcrypto";

create table if not exists public.ratings (
  player_id uuid primary key references public.players(id) on delete cascade,
  elo integer not null default 1000,
  wins integer not null default 0,
  losses integer not null default 0,
  matches_played integer not null default 0,
  updated_at timestamptz not null default now()
);

comment on table public.ratings is '선수별 Elo 및 복식 경기 전적 (티어는 elo로 앱에서 계산)';

alter table public.ratings enable row level security;

create policy "ratings_select_anon"
  on public.ratings for select
  to anon
  using (true);

create policy "ratings_insert_anon"
  on public.ratings for insert
  to anon
  with check (true);

create policy "ratings_update_anon"
  on public.ratings for update
  to anon
  using (true)
  with check (true);
