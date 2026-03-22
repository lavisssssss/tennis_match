## Ensol Tennis Aces (tennis_elo)

테니스 동호회 운영을 위한 **매치 일정·참석·경기 기록·대관료 정산** 웹앱입니다.  
Next.js(App Router) + Supabase(Postgres) 기반으로, 모바일에서 **로그인 후 참석 신청·경기 입력**을 남기는 것을 목표로 합니다.

**인증**: Supabase Auth는 사용하지 않습니다. `players` 테이블의 **이름 + 휴대폰 뒷 4자리**로 조회·가입하고, 브라우저 `localStorage` + `PlayerSessionProvider`(React Context)로 세션을 유지합니다.

---

## 기술 스택

- **Frontend**: Next.js 15(App Router), TypeScript, React 18, Tailwind CSS
- **Backend / DB**: Supabase(Postgres), `@supabase/supabase-js` v2, **anon key**로 클라이언트 접근(MVP)
- **주요 테이블**: `players`, `sessions`, `attendance`, `matches`, `club_settings`(선택), `ratings`(Elo·전적, `supabase/ratings.sql`)

---

## Supabase SQL (저장소 스크립트)

프로젝트 루트 `supabase/`에서 순서에 맞게 SQL Editor에 실행합니다.

| 파일 | 내용 |
|------|------|
| `club_settings.sql` | `club_settings` 테이블 + RLS(anon select/update), 자동 승인 플래그 |
| `players_role.sql` | `players.role` (`member` / `staff`) |
| `venue_fee.sql` | `sessions.venue_fee_closed`, `attendance.venue_settled` |
| `ratings.sql` | `ratings` 테이블(Elo, 승/패, 경기 수) + RLS |

핵심 DDL 통합 예시는 `PLAN.MD` 부록을 참고하세요.

---

## 라우트 요약

| 경로 | 설명 |
|------|------|
| `/` | 로그인(이름+뒷4자리), 성공 시 `/my-page` |
| `/my-page` | 마이페이지 — Elo·티어 마크·**임시 티어**(등록게임수 5미만: Australian Open 임시)·통산(승인 경기 집계)·통산 승률·최근 10게임 도넛·영혼의 파트너 Top3·티어 구분 안내 |
| `/participate` | 다가오는 `open` 매치 선택·참석 `attend`/`wait`/`cancel` 저장 |
| `/matchs` | 매치 목록·참석 현황(로그인 필수) |
| `/match-entry` | 복식 경기 결과 입력(로그인 필수, 해당 일정 `attend`만 팀 선택). 제출 버튼 라벨은 **결과 제출** |
| `/match-records` | 승인된 경기 기록 조회(로그인 필수), **선수별 티어 마크+이름**·스코어·Win 표시 |
| `/ranking` | 로그인 후 전체 선수 **Elo 랭킹**·티어 필터, 테이블 열 `#`·선수(마크+이름)·Elo **중앙 정렬** |
| `/admin/*` | **운영진(`role=staff`)**만 — `AdminGuard` |
| `/admin/roles` | 회원/운영진 역할 지정 |
| `/admin/players` | 선수 CRUD |
| `/admin/matchs` | 매치 일정·출석 관리·**팀 자동 생성**(참석 4인 단위 Snake) |
| `/admin/matches` | 경기 승인/반려, **자동 승인** 토글(`club_settings`) |
| `/admin/venue-fee` | 대관료 정산·일정 마감 |

리다이렉트: `/sessions` → `/matchs`, `/admin/sessions` → `/admin/matchs`

**상단 네비(`MainNav`)**: **My**(`/my-page`)·**참여신청**·(로그인 시) **매치조회**·**결과등록**·**결과조회**·**랭킹**. 모바일에서도 **한 줄**로 표시하고, 화면이 매우 좁으면 같은 줄 안에서 가로로 살짝 밀어 볼 수 있습니다.

---

## 사용자 매뉴얼(이미지)

회원 관점 **메뉴별** 안내 카드 PNG는 저장소 **`docs/user-manual/`** 에 있습니다.

- `user-manual-my.png` — My(마이페이지)
- `user-manual-participate.png` — 참여신청
- `user-manual-matchs.png` — 매치조회
- `user-manual-match-entry.png` — 결과등록
- `user-manual-match-records.png` — 결과조회
- `user-manual-ranking.png` — 랭킹

---

## DB 스키마 요약

### `players`
- `id`, `name`, `phone_last4`, `display_name`, `role` (`member` | `staff`), `created_at`

### `sessions` (매치 일정)
- `date`, `location`, `start_time`, `end_time`, `description`, `status` (`open` / `closed` / `deleted`)
- `venue_fee_closed` — 대관료 마감 시 정산 토글 잠금

### `attendance`
- `session_id`, `player_id`, `status` (`attend` / `cancel` / `wait`), `venue_settled`
- `UNIQUE (session_id, player_id)`

### `matches`
- 복식 4인 FK, `set1_score` / `set2_score` / `set3_score`, `status` (`pending` / `approved` / `rejected`)
- `created_by`, `approved_by`, `created_at`  
- DB 컬럼명은 소문자 `teama_player1` … `teamb_player2` 일 수 있음(Supabase PostgREST)

### `club_settings`
- 단일 행 `id=1`, `auto_approve_matches` — 켜면 경기 입력 시 곧바로 승인 처리될 수 있음

### `ratings`
- `player_id`, `elo`(기본 **1000** — `supabase/ratings.sql`·앱 `DEFAULT_ELO`), `wins`, `losses`, `matches_played`, `updated_at`
- 티어는 DB 컬럼 없음: **등록게임수 5미만**은 임시 티어, 이상은 **전체 선수 Elo 순위** 상·하위 각 30% 등(`lib/eloTier.ts`의 `resolveDisplayTier` / `getEloTierRelative`, `TierRosterProvider`, `public/tiers/*.png`)

---

## 로컬 개발

### 의존성

```bash
npm install
```

### 환경 변수

프로젝트 루트에 `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 개발 서버

```bash
npm run dev
```

**Windows + OneDrive**: `npm run dev` 전에 `.next`를 비우는 스크립트가 있을 수 있습니다. Next가 `.next` 내부에서 `readlink` → `EINVAL`이 나는 경우 `.next` 삭제 후 재실행하세요.

브라우저에서 `http://localhost:3000` 을 엽니다.

---

## 배포

Vercel 등 일반 Next.js 배포와 동일합니다. Supabase URL·anon 키를 환경 변수로 넣어야 합니다.

**운영진 최초 지정**: DB에서 해당 `players` 행의 `role`을 `staff`로 올리거나 `players_role.sql` 주석의 예시 `UPDATE`를 사용하세요. RLS로 `players` 업데이트가 막혀 있으면 정책을 확인합니다.

---

## 주요 컴포넌트·모듈 (참고)

- `components/TierBadge.tsx` — 텍스트 뱃지(매치 조회·어드민 등)
- `components/TierMarkImage.tsx` — 티어 로고 원형 마크(My page 안내, 결과 조회 등)
- `lib/myPageData.ts` — My page용 승인 경기 집계·최근 10게임·파트너 Top3

## 문서

- `PLAN.MD` — 아키텍처, 스키마, 페이지 설계, Phase 로드맵
- `dev_history.md` — 구현·결정 요약(에이전트/협업용)
