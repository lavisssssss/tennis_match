-- 대관료(총무) Phase 6 — Supabase SQL Editor에서 실행
alter table public.sessions
  add column if not exists venue_fee_closed boolean not null default false;

alter table public.attendance
  add column if not exists venue_settled boolean not null default false;

comment on column public.sessions.venue_fee_closed is '대관료 마감 완료 시 true (정산 토글 잠금)';
comment on column public.attendance.venue_settled is '해당 일정 참석 행의 대관료 정산 완료 여부';
