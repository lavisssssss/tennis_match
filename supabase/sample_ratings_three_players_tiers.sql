-- 샘플: 특정 3명의 ratings 행 (랭킹·티어 UI 테스트용)
-- Supabase SQL Editor에서 실행.
--
-- 앱 규칙 요약 (lib/eloTier.ts):
--   - 티어는 DB 컬럼이 아니라 "전체 선수" Elo 상대 순위로 계산됩니다.
--   - matches_played < 5 이면 누구나 "Australian Open (임시)"만 보이므로, 아래는 모두 5 이상으로 둡니다.
--   - 선수가 3명뿐이면: Elo 1위 → Wimbledon(상위), 2위 → US Open(중간), 3위 → Roland Garros(하위).
--   - 다른 선수도 ratings/같은 로스터에 많이 있으면 순위가 밀릴 수 있으니, 그때는 Elo 간격을 더 벌리거나
--     테스트용으로 다른 행을 잠시 비우고 확인하세요.

insert into public.ratings (player_id, elo, wins, losses, matches_played, updated_at)
select
  p.id,
  v.elo,
  v.wins,
  v.losses,
  v.matches_played,
  now()
from public.players p
inner join (
  values
    ('고은솔', '1226', 1400, 12, 6, 18),  -- 티어 1 (Wimbledon / Elite) 쪽이 되도록 가장 높은 Elo
    ('조용원', '9427', 1100, 10, 8, 18),  -- 티어 2 (US Open / Pro) 중간대
    ('오형선', '4025',  850,  6, 10, 16)   -- 티어 3 (Roland Garros / Rising) 쪽이 되도록 가장 낮은 Elo
) as v(name, phone_last4, elo, wins, losses, matches_played)
  on p.name = v.name and p.phone_last4 = v.phone_last4
on conflict (player_id) do update set
  elo = excluded.elo,
  wins = excluded.wins,
  losses = excluded.losses,
  matches_played = excluded.matches_played,
  updated_at = now();

-- 영향 받은 행이 3이 아니면 players.name / phone_last4 가 DB와 일치하는지 확인하세요.
-- (display_name 이 '고은솔1226' 형태여도 name·phone_last4 로 매칭합니다.)
