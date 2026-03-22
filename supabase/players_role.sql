-- Supabase SQL Editor에서 실행: 회원(member) / 운영진(staff) 구분
alter table public.players
  add column if not exists role text not null default 'member';

-- 기존 DB에 check가 없을 수 있어, 제약은 앱에서 검증합니다.
-- 필요 시: update public.players set role = 'member' where role is null;

comment on column public.players.role is 'member=회원, staff=운영진(Admin 접근)';

-- 최초 운영진 1명 지정 예시 (이름·id에 맞게 수정):
 update public.players set role = 'staff' where display_name IN ('오형선4025', '박남규6589');

-- RLS로 players UPDATE가 막혀 있으면 운영진이 권한을 바꿀 수 없습니다. anon에 update 허용 정책을 확인하세요.
