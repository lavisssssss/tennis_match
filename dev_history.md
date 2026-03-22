# dev_history (compact)

> 지금까지 개발·결정 요약. 다른 에이전트/협업용.

## 제품·코드베이스

- **Ensol Tennis Aces** (저장소명 tennis_elo)
- UI 브랜딩: `AppHeader` 등 민트(`teal-600`) 톤

## Stack

- Next.js 15 App Router, TS, Tailwind, Supabase(Postgres), **anon key** (Supabase Auth 미사용)
- 세션: `PlayerSessionProvider` + `localStorage` (`name` + `phone_last4` → `players` 조회/INSERT)
- Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 용어

- UI/문서: **매치(Matchs)** — DB 테이블명은 **`sessions`**, FK **`session_id`**
- 경기 기록: **`matches`** (`pending` / `approved` / `rejected`). PostgREST 컬럼은 **`teama_player1`…`teamb_player2`**(소문자)

## DB 요약

| 테이블 | 역할 |
|--------|------|
| `players` | name, phone_last4, display_name, **role** `member`/`staff` |
| `sessions` | 매치 일정, **status** open/closed/deleted, **venue_fee_closed** |
| `attendance` | session_id + player_id, attend/wait/cancel, **venue_settled** |
| `matches` | 복식 4인, set 점수, status, created_by, approved_by |
| `club_settings` | 단일 행, **auto_approve_matches** (경기 입력 자동 승인) |
| `ratings` | Elo, wins, losses, matches_played — 승인 시 갱신, 티어는 전원 분포 기준 상대(`eloTier` + `TierRosterProvider`) |

추가 마이그레이션: `supabase/club_settings.sql`, `supabase/players_role.sql`, `supabase/venue_fee.sql`, `supabase/ratings.sql`

## 라우트

| 경로 | 설명 |
|------|------|
| `/` | 로그인 → 성공 시 `/my-page` |
| `/my-page` | Elo·티어·전적 |
| `/participate` | open 매치 선택 + 참석 upsert |
| `/matchs`, `/match-entry`, `/match-records`, `/ranking`, `/match-suggest` | 로그인 필수 |
| `/admin/*` | **staff** + `AdminGuard` |
| `/admin/roles` | 회원/운영진 |
| `/admin/venue-fee` | 대관료 정산·마감 |
| 리다이렉트 | `/sessions`→`/matchs`, `/admin/sessions`→`/admin/matchs` |

## Phase 완료 요약

- **1–2**: 환경, 선수 CRUD
- **3**: 매치 CRUD, **로그인·Participate 참석**, `/matchs` 조인(로그인 필수)
- **4**: `/admin/matchs` 참석 수정·추가
- **5**: match-entry(로그인·attend 풀, 게임 수 0–6), admin 승인/반려, **club_settings 자동 승인**, elo 골격, match-records
- **병행**: `players.role`, **AdminGuard**, `/admin/roles`
- **6(대관료)**: `venue_fee_closed` / `venue_settled`, `/admin/venue-fee`
- **7(Elo·티어·팀)**: `ratings` + `applyEloForApprovedMatch`, 자동/수동 승인 시 DB 반영, `eloTier`, `/my-page`, `/matchs`·`/admin/matchs` 티어 배지, `teamMatching` + 회원 **`/match-suggest`** 매칭추천(Admin 매치 상세 팀 생성 UI는 이전)

## 2026-03 — My page·티어·표시 정비

- **Elo 기본값**: 앱·`supabase/ratings.sql` 신규 설치 기준 **`DEFAULT_ELO = 1000`** (`lib/ratings.ts` export). 기존 DB는 `ALTER … SET DEFAULT`·필요 시 `UPDATE`로 별도 맞춤.
- **임시 티어**: `ratings.matches_played`가 **5 미만**이면 **Australian Open (임시)** (`australian_open_provisional`, 마크 `public/tiers/australian-open-provisional.png`). 그 외는 전원 Elo 상대 순위 3분할(`getEloTierRelative`).
- **`resolveDisplayTier`**: UI 공통. `TierRosterEntry`에 **`matches_played`** 포함, `listAllPlayersWithElo()`가 조회. **`TierBadge`**·**`TierMarkImage`**가 동일 규칙 사용.
- **My page**: Elo+티어 마크(66px)·통산은 **`computeApprovedMatchCareerStats`** + 통산 승률%; 최근 10게임 도넛·**영혼의 파트너 Top3**. (하단 긴 티어 목록은 이후 **Tier System** 칸으로 이전 — **2026-03 후반**.)
- **결과 조회** (`/match-records`): 각 선수 **티어 마크+이름**, 1세트 스코어 `a:b`, Win 배지 유지.
- **유틸**: `lib/myPageData.ts` — `computeApprovedMatchCareerStats`, `computeRecentGamesDigest`, (잔존) `listPastSessionsWithVenueNotClosed` 등.
- **비용 정산 알림**: My page에서 제거됨(이전 staff 전용 블록). 대관 로직은 `myPageData`에 함수 잔존 가능.

## 2026-03-22 — 회원 네비·랭킹·결과 등록 카피

- **`components/MainNav.tsx`**: **Home → My**·`/my-page` 연결, 6메뉴·한 줄 레이아웃 시작(세부는 **2026-03 후반**).
- **`app/ranking/page.tsx`**: 테이블 **중앙 정렬**(`#`, 선수+마크, Elo).
- **`lib/ratings.ts`**: `PlayerRankingRow`에 `wins`/`losses`·승/패 열은 후속 추가.
- **`app/match-entry/page.tsx`**: 경기 일정 선택 아래 **선택됨: …** 안내·**참석 인원만 표시(대기/취소 제외)** 문구 제거. 제출 버튼 **결과 제출(승인 대기) → 결과 제출**. 버튼 하단 **Admin 승인 안내·게임 수/DB 저장 예시** 문구 제거. 미사용 `selectedSession` 제거.

## 2026-03 후반 — 랭킹·매칭추천·My·티어 UI·공통 경기 카드

- **`lib/eloTier.ts` `resolveDisplayTier`**: My와 랭킹 티어 불일치 방지 — `matchesPlayedOverride`(통산 승인 경기 수)와 roster `matches_played`의 **max**로 임시 티어(5미만) 판정.
- **`MainNav`**: 첫 항목 **MY**, 4글자 메뉴 **2줄** 표기(참여/신청·매치/조회 등), `flex-1`로 한 줄 균등 너비.
- **`/ranking`**: 열 **승/패** (`ratings.wins` / `losses`). **매칭추천** → `/match-suggest`.
- **`/match-suggest`**: 다가오는 open 매치·참석 4명 이상·본인 포함 4인(미선택 시 참석 풀 **랜덤** 보충)·`suggestCourtsFromAttendees`(Snake). 안내 카피: Rating 기반 파트너·매칭상대 등.
- **`app/admin/matchs`**: **팀 자동 생성** 블록 제거 → 기능을 `/match-suggest`로 이전.
- **`/my-page`**: Elo 블록 오른쪽 **Tier System** — 4티어 마크+라벨 전체, 하단 회색 `*등록게임수 5게임 미만 임시 티어 적용`. Elo 좌측 3줄에 **display_name**. 하단 **나의 전적**: `fetchMyApprovedMatchLines` + **`components/ApprovedMatchResultRow`** (`/match-records`와 동일 카드).
- **`lib/matches.ts` `listApprovedMatches`**: 선택적 **`player_id`** — 해당 선수가 뛴 승인 경기만.
- **`lib/myPageData.ts`**: `fetchMyApprovedMatchLines` 유지; 한 줄 포맷터는 제거(카드 UI로 통일).

## 미구현(PLAN 기준)

- **Phase 7 옵션**: 티어 경계를 `club_settings`로 설정, 추천 팀을 `matches`에 자동 저장
- **Phase 8**: 선수 사진 Storage

## 운영/이슈

- **Win + OneDrive**: `.next` readlink `EINVAL` → `.next` 삭제 후 `npm run dev`, 또는 프로젝트를 OneDrive 밖으로
- **GitHub push**: `node_modules`·`.next` 제외; `.gitignore`는 **UTF-8**
- Remote: `https://github.com/lavisssssss/tennis_match.git` — 소스만 push, clone 후 `npm install`
