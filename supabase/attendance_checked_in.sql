-- Supabase SQL Editor에서 한 번 실행하세요.
-- 참석(attend) 신청 인원 중 실제 출결 여부. ON인 행만 대관료 정산(Phase 6) 목록에 표시됩니다.

alter table public.attendance
  add column if not exists checked_in boolean not null default false;

comment on column public.attendance.checked_in is '참석(attend) 중 실제 출결. true일 때만 대관료 정산 리스트에 포함';
