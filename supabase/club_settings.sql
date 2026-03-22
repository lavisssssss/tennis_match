-- Supabase SQL Editor에서 한 번 실행하세요.
-- 경기 결과 자동 승인(on/off)을 모든 클라이언트가 동일하게 보려면 DB에 저장합니다.

create table if not exists public.club_settings (
  id smallint primary key default 1,
  auto_approve_matches boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint club_settings_singleton check (id = 1)
);

insert into public.club_settings (id, auto_approve_matches)
values (1, false)
on conflict (id) do nothing;

alter table public.club_settings enable row level security;

create policy "club_settings_select_anon"
  on public.club_settings for select
  to anon
  using (true);

create policy "club_settings_insert_anon"
  on public.club_settings for insert
  to anon
  with check (id = 1);

create policy "club_settings_update_anon"
  on public.club_settings for update
  to anon
  using (true)
  with check (true);
