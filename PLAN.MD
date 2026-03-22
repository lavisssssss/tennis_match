## 1. 프로젝트 개요

이 문서는 테니스 동호회 경기 운영을 위한 웹 서비스(**Ensol Tennis Aces** / 코드베이스명 tennis_elo)의 MVP·확장 개발 계획을 정리한 것이다.  
서비스는 다음을 목표로 한다.

- **경기 일정 공지**: 다음/향후 경기 **매치**(경기 일정) 정보를 한눈에 확인
- **참석 신청 및 출석 관리**: 동호회원이 간단히 참석 여부를 표시하고, Admin이 실제 출석을 관리
- **경기 기록 및 승인**(MVP 이후): 로그인 회원이 경기 결과를 입력하고, 운영진이 승인
- **Elo 기반 실력 추정**(MVP 이후): 경기 결과를 바탕으로 선수별 실력 수치화
- **Elo 구간별 티어**(MVP 이후): 등록게임수 부족 시 **Australian Open (임시)**; 그 외 **Wimbledon (Elite)**, **US Open (Pro)**, **Roland Garros (Rising)** 중 하나를 전원 Elo 상대 순위로 부여·표시(구간 경계는 설정 가능)
- **실력 기반 팀 매칭**(MVP 이후): 참석자들의 Elo(및 필요 시 티어 가시화)를 기준으로 균형 잡힌 복식 팀 구성

MVP 단계에서는 **경기 일정 + 참석 신청/출석 관리**를 우선 구현하고, 이후 단계적으로 경기 기록, Elo, 팀 매칭 기능을 확장한다.

- **Frontend**: Next.js (App Router) + TypeScript
- **UI**: Tailwind CSS
- **Database**: Supabase (Postgres) – **Supabase Auth는 미사용**. 앱 레벨 로그인은 `players` 테이블(이름+뒷4자리) + 브라우저 `localStorage` 세션으로 처리.
- **Hosting**: Vercel (Next.js 배포)

---

## 2. 아키텍처 개요

### 2.1 전체 구조

- **사용자(회원/운영진)** → 브라우저
- 브라우저 → **Next.js 웹 앱 (Vercel 호스팅)**
- Next.js 앱 → **Supabase(Postgres) 데이터베이스**

**Supabase anon key**로 클라이언트에서 직접 읽기/쓰기한다.  
**로그인**: `name` + `phone_last4` 조합으로 `players` 조회·신규 가입(INSERT). 세션은 `PlayerSessionProvider`(React Context) + `localStorage`로 전역 공유.  
**Admin**: `players.role = 'staff'`(운영진)인 경우에만 `/admin/*` 접근(`AdminGuard`). 일반 회원은 헤더에 환영 문구·로그아웃만 표시, 운영진은 **Admin** 링크 추가.

#### 개념도 (텍스트)

- 로그인 후: `/participate` 참석 신청, `/matchs`·`/match-entry`·`/match-records`(로그인 필수), `/my-page`(로그인 후 홈 진입 시 리다이렉트)
- 운영진: `/admin`, `/admin/roles`, `/admin/venue-fee`, 기존 선수·매치·승인 화면
- 모든 페이지는 **Supabase JS SDK**로 `players`, `sessions`, `attendance`, `matches`, (옵션) `club_settings` 등을 읽고/쓴다.

### 2.2 디렉터리 구조(현행)

- `app/`
  - `layout.tsx` : 메타데이터, `AppProviders`(`PlayerSessionProvider` + `TierRosterProvider`), 헤더·네비
  - `page.tsx` : 루트 **로그인** – 로그인 카드, 로그인 성공 시 `/my-page`로 이동(헤더 네비 첫 항목은 **My**로 `/my-page` 연결)
  - `participate/page.tsx` : 참석 신청(다가오는 매치 + 상태 저장)
  - `my-page/page.tsx` : 마이페이지(Elo·티어 마크·통산·최근 10게임·파트너 Top3·티어 구분 안내)
  - `matchs/`, `match-entry/`, `match-records/`, `ranking/` : 매치 조회·결과 등록·결과 조회·Elo 랭킹(비로그인 시 안내)
  - `admin/layout.tsx` : `AdminGuard`(운영진만)
  - `admin/page.tsx` : Admin 허브
  - `admin/players`, `admin/matchs`, `admin/matches`, `admin/roles`, `admin/venue-fee`
- `components/` : `AppHeader`, `MainNav`, `PlayerSessionProvider`, `AdminGuard`, `TierRosterProvider`, `TierBadge`, `TierMarkImage`, `WinLossDonut` 등
- `lib/` : `supabaseClient`, `players`, `sessions`, `attendance`, `matches`, `clubSettings`, `elo`, `ratings`, `eloTier`, `tierBranding`, `myPageData`, `teamMatching` 등
- `supabase/*.sql` : `club_settings`, `players_role`, `venue_fee` 등 **수동 적용 마이그레이션** 스크립트

---

## 3. 데이터베이스 스키마 (Supabase)

PRD의 데이터 모델(9장)을 기준으로 Supabase Postgres에 다음 테이블을 생성한다.

### 3.1 `players` – 선수 정보

- **컬럼**
  - `id` (uuid, PK)
  - `name` (text) – 실이름, 예: `"오형선"`
  - `phone_last4` (text) – 연락처 뒷자리 4자리, 예: `"4025"`
  - `display_name` (text) – 화면 표기용, 예: `"오형선4025"`
  - `role` (text, 기본 `member`) – `member`(회원) | `staff`(운영진, Admin 접근) — `supabase/players_role.sql`
  - `created_at` (timestamptz, default `now()`)
- **설명**
  - 로그인 키는 **`name` + `phone_last4`** 조합(동명이인은 뒷자리로 구분).
  - 드롭다운·표시는 주로 `display_name`.
  - 선수 CRUD는 Admin(운영진) 화면.

### 3.2 `sessions` – 매치(경기 일정)

- **컬럼**
  - `id` (uuid, PK)
  - `date` (date) – 경기 날짜
  - `location` (text) – 경기 장소
  - `start_time` (time) – 시작 시간
  - `end_time` (time) – 종료 시간
  - `description` (text, nullable) – 추가 설명
  - `status` (text) – `open` | `closed` | `deleted`
  - `venue_fee_closed` (boolean, 기본 false) – **대관료 마감 완료** 시 true(정산 토글 잠금) — `supabase/venue_fee.sql`
  - `created_by` (text 또는 uuid, nullable) – 생성자 식별용
  - `created_at` (timestamptz, default `now()`)
- **설명**
  - `/participate`, `/matchs` 등에서 공지·조회의 기본 단위.
  - Admin이 `/admin/matchs`에서 생성/수정한다.

### 3.3 `attendance` – 참석 신청/출석 기록

- **컬럼**
  - `id` (uuid, PK)
  - `session_id` (uuid, FK → `sessions.id`)
  - `player_id` (uuid, FK → `players.id`)
  - `status` (text) – `attend` | `cancel` | `wait`
  - `venue_settled` (boolean, 기본 false) – 해당 일정·참석 행의 **대관료 정산 완료** — `supabase/venue_fee.sql`
  - `created_at` (timestamptz, default `now()`)
- **제약 및 규칙**
  - `UNIQUE (session_id, player_id)` – 한 매치당 한 선수는 한 줄만 존재.
  - 사용자는 `/participate`에서 로그인 계정으로 참석 상태를 `upsert`한다.
  - Admin은 `/admin/matchs`에서 `status` 조정.
  - 총무는 `/admin/venue-fee`에서 참석자별 `venue_settled` 및 일정별 `venue_fee_closed`를 관리한다.

### 3.4 `matches` – 경기 기록 (MVP 이후)

- **컬럼**
  - `id` (uuid, PK)
  - `session_id` (uuid, FK → `sessions.id`)
  - `teamA_player1` (uuid, FK → `players.id`)
  - `teamA_player2` (uuid, FK → `players.id`)
  - `teamB_player1` (uuid, FK → `players.id`)
  - `teamB_player2` (uuid, FK → `players.id`)
  - `set1_score` (text, 예: `"6-4"`)
  - `set2_score` (text, 예: `"6-2"`)
  - `set3_score` (text, nullable)
  - `status` (text) – `pending` | `approved` | `rejected`
  - `created_by` (text 또는 uuid)
  - `approved_by` (text 또는 uuid, nullable)
  - `created_at` (timestamptz, default `now()`)
- **설명**
  - 로그인 회원이 Match Entry에서 입력하면 기본 `pending`이거나, `club_settings.auto_approve_matches`가 true이면 곧바로 `approved`로 INSERT될 수 있다.
  - Admin이 `/admin/matches`에서 승인/반려를 결정한다(자동 승인 off인 경우).

### 3.5 `ratings` – Elo 및 통계 (MVP 이후)

- **컬럼**
  - `player_id` (uuid, PK, FK → `players.id`)
  - `elo` (integer, default **`1000`** — 앱 `DEFAULT_ELO`와 동기)
  - `wins` (integer, default `0`)
  - `losses` (integer, default `0`)
  - `matches_played` (integer, default `0`)
  - `updated_at` (timestamptz, default `now()`)
- **설명**
  - 각 선수당 한 줄만 존재(1:1).
  - 경기 승인 시 Elo와 간단한 카운터 통계를 함께 업데이트한다.
  - **티어는 DB 컬럼으로 두지 않는다.** `matches_played`(등록게임수)가 **5 미만**이면 **임시 티어**(Australian Open 임시); 그 이상이면 등록된 **전체 선수**의 `elo` 분포로 **상대 순위** 티어를 계산한다(`resolveDisplayTier` → `getEloTierRelative`, `TierRosterProvider`). 인원이 늘거나 Elo가 바뀌면 티어도 바뀔 수 있다.

#### 3.5.1 Elo 티어 (사용자별 부여 규칙 — 상대 순위)

**임시 티어(선행 조건)**: `ratings.matches_played` **5 미만**이면 아래 상대 순위와 무관하게 **`australian_open_provisional`** — 표기 **Australian Open (임시)** (마크: `public/tiers/australian-open-provisional.png`).

그 외 선수에 대해, 동호회 **전체 등록 선수**(`players` 기준, `ratings` 없으면 Elo 기본값 1000)를 Elo **내림차순**으로 줄 세운 뒤, 아래 **세 티어 중 하나**를 부여한다.

| 코드(내부) | 표기명 | 부제(영문) |
|------------|--------|------------|
| `roland_garros` | Roland Garros | Rising |
| `us_open` | US Open | Pro |
| `wimbledon` | Wimbledon | Elite |

- **비율(현행)**  
  - **Wimbledon (Elite)**: 상위 **30%** (앞쪽 `ceil(0.3×N)`명, 인원 적을 때는 상·하위 구간이 겹치지 않도록 자동 축소)  
  - **Roland Garros (Rising)**: 하위 **30%** (뒤쪽 동일 인원 수)  
  - **US Open (Pro)**: 나머지 (대략 중간 40%, `N`에 따라 달라짐)  
- **동점·정렬**: 같은 Elo면 `player_id` 문자열 순으로 안정 정렬해 순위를 고정한다.
- **특수**: 선수가 **1명뿐**이면 티어 의미가 없어 **전원 US Open**으로 둔다.
- **데이터 소스**: `listAllPlayersWithElo()` — `players` 전체 + `ratings.elo`·**`matches_played`** 조인(없으면 Elo 1000·경기수 0). 앱 전역에서 `TierRosterProvider`가 주기적으로 갱신(초기 로드·창 포커스 등). UI 표시는 **`resolveDisplayTier`**(임시 티어 + 상대 티어)를 사용한다.
- **확장(옵션)**: 상·하위 비율을 `club_settings`로 빼거나, 티어 갱신을 승인 직후 이벤트로 트리거.

### 3.6 `club_settings` – 동호회 전역 플래그 (선택)

- **컬럼**: 단일 행 `id=1`, `auto_approve_matches` (boolean) 등 — `supabase/club_settings.sql`
- **용도**: 경기 결과 **자동 승인** On/Off(`/admin/matches`). 켜면 `matches`가 곧바로 `approved`로 INSERT될 수 있다.

---

## 4. 페이지 설계

### 4.1 Home · Participate · My page

- **Home (`app/page.tsx`)**
  - 로그인 폼(`name` + 뒷4자리). 미가입 시 가입 확인 후 INSERT.
  - 로그인 성공 시 **`/my-page`로 리다이렉트**.
- **Participate (`app/participate/page.tsx`)** — 기존 Home의 참석 신청 기능
  - 다가오는 `open` 매치 선택, 로그인 계정으로 `attend/wait/cancel` 저장.
- **My page (`app/my-page/page.tsx`)**
  - 로그인 필수.
  - 본인 **Elo**(`ratings`)·**티어 마크+이름**(임시 티어 포함)·**통산**(승인 `matches` 기준 집계 `computeApprovedMatchCareerStats` + 통산 승률)·**최근 승률 10게임**(도넛)·**영혼의 파트너 Top3**(`players.name`, 같이 친 경기 많은 순).
  - 하단 **\*티어 구분**: Wimbledon / US Open / Roland Garros / Australian Open (임시) 안내 + 작은 티어 마크.

### 4.2 Matchs 목록 (`app/matchs/page.tsx`)

- **목표**
  - **로그인 필수.** 과거/미래 경기 매치를 리스트로 보여주고, 각 매치의 참석 현황을 한눈에 확인.
- **화면 요소**
  - 매치 리스트
    - 날짜, 장소, 시간, 설명
    - (옵션) 탭: `다가오는 경기 / 지난 경기`
  - 매치 선택 시 상세 패널/영역
    - 매치 기본 정보
    - 참석자 목록
      - `display_name` + `status(attend/cancel/wait)`  
      - (Phase 7) `ratings` 조인 시 **티어 배지** 병기 가능
- **데이터 사용**
  - `sessions`
  - `attendance` + `players` 조인

### 4.3 Match Entry (`app/match-entry/page.tsx`)

- **목표**
  - 로그인한 회원이 복식 경기 결과를 입력한다.
- **화면 요소**
  - **입력자**: 로그인 계정 고정(수정 불가).
  - 매치 선택(`open` 일정), **A1~B2**는 해당 매치에서 **`attend`인 인원만** 드롭다운에 표시. A1 기본값은 로그인자(변경 가능), A2는 수동 선택.
  - 게임 수 0–6 버튼 → `matches` pending 또는(`club_settings`) 자동 승인 시 approved.
- **데이터 사용**
  - `sessions`, `attendance`, `players`, `matches`, (옵션) `club_settings`

### 4.3b 결과 조회 (`app/match-records/page.tsx`)

- **목표**: 일정(`sessions`) 선택 후 해당 매치의 **승인된** `matches`만 목록으로 본다.
- **화면**: `[` **티어 마크+이름** ×4, 1세트 스코어 `a:b` 형식, `]` · 승 팀 쪽 **Win** 배지. (`TierMarkImage` + `resolveDisplayTier`)
- **데이터**: `listApprovedMatches` + `players` 조인(`name`/`display_name`).

### 4.4 Admin Dashboard (`app/admin/page.tsx`)

- **목표**
  - **운영진(`role=staff`)**만 접근. 주요 관리 기능 허브.
- **화면 요소**
  - `Admin 권한 관리` → `/admin/roles` (회원/운영진)
  - `선수 관리` → `/admin/players`
  - `매치(경기 일정)/출석 관리` → `/admin/matchs`
  - `경기 기록 승인` → `/admin/matches` (자동 승인 토글 포함, `club_settings`)
  - `대관료 관리` → `/admin/venue-fee`
  - (게스트 화면 바로가기 링크)
- **접근 제어**
  - `app/admin/layout.tsx` + `AdminGuard`: 비로그인 → `/`, 회원 → `/my-page`, 운영진만 children 렌더.

### 4.4b Admin – 대관료 관리 (`app/admin/venue-fee/page.tsx`)

- 매치 일정 **날짜·시간 내림차순**, 배지 **마감진행중 / 마감완료**(`sessions.venue_fee_closed`).
- 일정 선택 시 **참석(`attend`) 인원** 목록·명수, 행별 **정산 완료** 토글(`attendance.venue_settled`).
- **저장**: 토글만 DB 반영. **마감완료** 후에는 토글·저장 비활성, **마감취소**로 해제 가능.

### 4.5 Admin – 선수 관리 (`app/admin/players/page.tsx`)

- **목표**
  - Admin이 선수 정보를 관리(추가/수정/비활성화)하고, **프로필 사진을 업로드/변경**할 수 있다.
- **화면 요소**
  - 선수 리스트 테이블
    - `display_name`, `name`, `phone_last4`, (추후) `photo` 썸네일
  - 새 선수 추가 폼
    - `name`, `phone_last4` 입력
    - `display_name`은 `name + phone_last4` 자동 생성
  - 기존 선수 수정 기능
    - `name`, `phone_last4`, `display_name` 수정 가능
  - (비핵심 기능 단계) 선수 프로필 사진 관리
    - 선택한 선수에 대해 **사진 업로드/변경 버튼**
    - 파일 선택 후 Supabase Storage에 업로드, 반환된 URL을 `players.photo_url`에 저장
- **데이터 사용**
  - `players` 전체 조회 / 정렬
  - insert / update
  - (비핵심 기능 단계) `players.photo_url` 업데이트 및 Supabase Storage 경로 관리

### 4.6 Admin – 매치(경기 일정)/출석 관리 (`app/admin/matchs/page.tsx`)

- **목표**
  - Admin이 매치를 생성/수정하고, 출석 현황을 상세하게 관리한다.
- **화면 요소**
  - 매치 리스트
    - 날짜/장소/시간/설명
    - `새 매치 생성` 버튼
  - 매치 생성/수정 모달
    - 날짜, 위치, 시간, 설명 입력 및 저장
  - 매치 상세(선택 시)
    - 해당 매치의 `attendance` 목록
    - 각 참석자에 대한 `status` 드롭다운(`attend/cancel/wait`)
    - (Phase 7) 출석자 **Elo·티어** 표시 및 **팀 자동 생성** 버튼(§5.4)
- **데이터 사용**
  - `sessions` 목록 조회 및 insert/update
  - `attendance` + `players` 조인 조회
  - 출석 상태 update

### 4.7 Admin – 경기 승인 (`app/admin/matches/page.tsx`)

- **목표**
  - 회원이 입력한 `pending` 경기를 검토하여 `approved` / `rejected`로 변경하고, 승인 시 Elo 계산을 수행한다.
  - `club_settings`의 **자동 승인** 토글로 신규 입력이 바로 승인되는 모드를 제어한다.
- **화면 요소**
  - `pending` 경기 리스트
    - 매치 정보, 팀 구성, 요약 스코어
  - 경기 상세 패널
    - 팀별 선수, 세트별 점수
  - 버튼
    - `승인` (Elo 업데이트 트리거)
    - `반려`
- **데이터 사용**
  - `matches` (`status = 'pending'`)
  - 승인 시 `matches.status` 업데이트 + Elo 로직 호출

---

## 5. 주요 비즈니스 로직

### 5.1 참석 신청 흐름 (`/participate`)

1. 로그인 세션(`player_id`)이 있어야 한다. 없으면 Home으로 안내.
2. 페이지 로드 시 오늘 이후 `open` `sessions` 목록 조회.
3. 사용자가 매치·`attend/cancel/wait` 선택 후 저장 시 `attendance` **upsert** (`session_id`, `player_id`, `status`).
4. Toast 등으로 결과 표시.

### 5.2 출석 체크 흐름 (Admin 매치 상세)

1. Admin이 `/admin/matchs`에서 특정 매치를 선택한다.
2. 해당 매치의 `attendance` + `players` 조인 결과를 조회해 리스트로 보여준다.
3. 경기 당일 실제 상황에 맞게 각 row의 `status`를 `attend` 또는 `cancel` 등으로 수정한다.
4. 변경 사항은 곧바로 `attendance` update로 반영되고, 이후 **팀 매칭 및 통계의 기준 데이터**가 된다.

### 5.3 경기 기록 및 승인 + Elo 업데이트 (MVP 이후)

#### 5.3.1 경기 기록 입력 (Match Entry)

1. 로그인한 회원이 Match Entry에 접속.
2. `open` 일정과 해당 일정의 `attend` 인원만 드롭다운에 표시, 입력자는 로그인 계정.
3. 게임 수(0–6)로 `set1_score`/`set2_score` 형식 저장.
4. 저장 시: `club_settings.auto_approve_matches`에 따라 `pending` 또는 `approved`로 insert.

#### 5.3.2 경기 승인 흐름 (Admin)

1. Admin이 `/admin/matches`에서 `status = 'pending'` 경기 리스트를 조회.
2. 특정 경기를 선택해 팀 구성과 스코어를 확인.
3. 경기 결과가 유효하면:
   - `matches.status`를 `approved`로 update.
   - `lib/elo.ts`에 정의된 Elo 계산 함수를 호출하여 네 명의 선수에 대한 Elo를 재계산.
4. 문제가 있는 경우:
   - `matches.status`를 `rejected`로 변경하거나, 필요 시 수정 후 다시 저장.

#### 5.3.3 Elo 계산 로직 개요

- 각 선수는 `ratings.elo` 점수를 가진다(초기값 **1000**).
- 복식 경기에서는 **각 팀의 평균 Elo**를 사용해 기대 승률을 계산한다.
  - `teamA_elo = (playerA1_elo + playerA2_elo) / 2`
  - `teamB_elo = (playerB1_elo + playerB2_elo) / 2`
- 기대 승률:
  - \(E_A = 1 / (1 + 10^{(teamB\_elo - teamA\_elo)/400})\)
  - \(E_B = 1 - E_A\)
- 실제 결과:
  - 팀 A 승: `S_A = 1`, `S_B = 0`
  - 팀 B 승: `S_A = 0`, `S_B = 1`
- 업데이트(K = 20 예시):
  - `new_teamA_elo = teamA_elo + 20 * (S_A - E_A)`
  - `new_teamB_elo = teamB_elo + 20 * (S_B - E_B)`
  - 팀 Elo 변화량을 두 선수에게 동일하게 반영하여 각 선수의 `ratings.elo`를 업데이트한다.
  - 승인 직후 각 선수의 갱신된 `elo`에 대해 **티어**를 다시 계산해 UI에 반영한다(저장은 `elo`만).

#### 5.3.4 Elo 티어 산출 (구현 메모)

- 입력: `elo` (integer)  
- 출력: `{ tierCode, labelKo, labelEn }` 예: `wimbledon`, `Wimbledon`, `Elite`
- 티어는 §3.5.1 **상대 순위** 규칙과 동일; 단위 테스트로 `N`명·동점 Elo·상·하위 30% 경계 인덱스를 검증 권장.

### 5.4 팀 매칭 로직 개요 (MVP 이후)

- **목표**: 특정 매치에서 `status = 'attend'`인 출석자들을 입력으로 받아, **팀 평균 Elo 차이를 최소화**하는 복식 팀을 제안한다. UI에는 각 선수의 **티어 배지**를 함께 보여 주어 현장에서 실력감을 빠르게 파악할 수 있게 한다.

#### 입력

- 특정 매치의 출석 선수 목록:
  - `[{ player_id, elo }, ...]`  
  - `elo`는 `ratings` 테이블에서 조회.

#### 알고리즘(초기 버전 – Snake draft)

1. 출석 선수 목록을 Elo 내림차순으로 정렬한다.
2. 상위부터 **4명씩 그룹**으로 나눈다.
3. 각 4인 그룹에 대해:
   - Elo1 ≥ Elo2 ≥ Elo3 ≥ Elo4라 할 때,
   - 기본 조합:  
     - Team A: Elo1 + Elo4  
     - Team B: Elo2 + Elo3
4. 전체 매치 출석자에 대해 위 과정을 반복해 여러 매치를 구성한다.

#### 출력

- 팀 구성 리스트:
  - 각 매치마다 `teamA_player1/2`, `teamB_player1/2` 및 예상 Elo 차이 정보.
  - (옵션) 팀별 **평균 티어** 요약(예: 양 팀 모두 ATP 중심인지)은 표시용으로만 사용; 알고리즘의 1차 기준은 수치 **Elo**다.
- Admin UI:
  - "팀 자동 생성" 버튼 클릭 시 이 결과를 화면에 보여주고, 필요 시 `matches`에 자동 저장하는 기능으로 확장 가능.

#### 확장(선택)

- **티어 균형**: 4인 조합이 여러 개 비슷한 Elo 밸런스를 가질 때, 양 팀 **티어 분포**(Wimbledon 인원 수 차이 등)를 보조 점수로 두는 방식은 Phase 7 후반에 검토.

---

## 6. 개발 단계 및 우선순위

아래 단계는 **MVP 우선 → 확장 기능** 순으로 진행한다. 각 Phase는 대략적인 완료 기준을 포함한다.

- [x] **Phase 1 – 프로젝트 환경 구축**
  - [x] Next.js(App Router) + TypeScript 프로젝트 생성
  - [x] Tailwind CSS 셋업 및 기본 레이아웃/테마 구성
  - [x] Supabase 프로젝트 생성 및 환경 변수 설정
  - [x] Supabase에 기본 테이블 생성: `players`, `sessions`, `attendance`
  - [x] 로컬/프리뷰 환경에서 Supabase 연결 확인

- [x] **Phase 2 – 선수 관리(Admin)**
  - [x] `/admin/players` 페이지 구현
  - [x] 선수 목록 조회 테이블
  - [x] 새 선수 추가 폼 (`name`, `phone_last4` → `display_name` 자동 생성)
  - [x] 기존 선수 수정 기능
  - [x] Home/Matchs 등에서 사용할 드롭다운이 이 데이터를 기반으로 동작할 수 있도록 API/훅 준비

- [x] **Phase 3 – 경기 일정 + 참석 신청**
  - [x] `/admin/matchs` 페이지에서 매치 목록 조회
  - [x] `/admin/matchs` 페이지에서 매치 생성/수정 모달 구현
  - [x] 앱 레벨 로그인(`name`+뒷4자리) + `PlayerSessionProvider` / `localStorage` 세션
  - [x] Home: 로그인 카드, 성공 시 `/my-page` 리다이렉트
  - [x] `/participate`: 다가오는 `open` 매치 선택 + 로그인 계정으로 참석 upsert
  - [x] `/matchs` 등 주요 회원 화면 **로그인 필수**
  - [x] `/matchs`에서 매치 리스트 및 참석 현황(조인 조회) 표시

- [x] **Phase 4 – 출석 체크(관리자)**
  - [x] `/admin/matchs` 상세 화면에서 해당 매치의 `attendance` 리스트 표시
  - [x] 각 참석자의 `status`를 수정할 수 있는 UI 제공
  - [x] 경기 당일 실제 출석에 맞게 상태를 `attend/cancel`로 변경 가능하도록 처리

- [x] **Phase 5 – 경기 기록 & 승인 (추가)**
  - [x] `/match-entry`: 로그인 계정, 해당 일정 `attend` 인원만 선택, 게임 수 0–6 입력
  - [x] `club_settings` + `/admin/matches`에서 **자동 승인** 토글(`submitMatchResult` 연동)
  - [x] `/admin/matches`에서 `pending` 경기 리스트 및 승인/반려
  - [x] `lib/elo.ts`에 Elo 계산 로직 골격 및 `onMatchApproved` 연동
  - [x] `/match-records`에서 승인된 기록 조회

- [x] **운영진·권한 (Phase 5 병행 완료)**
  - [x] `players.role`(`member`/`staff`) — `supabase/players_role.sql`
  - [x] `AdminGuard` + `/admin/roles`에서 운영진 지정

- [x] **Phase 6 – 대관료(총무)**
  - [x] `sessions.venue_fee_closed`, `attendance.venue_settled` — `supabase/venue_fee.sql`
  - [x] `/admin/venue-fee` UI(일정별 정산·마감)

- [x] **Phase 7 – Elo·티어 및 팀 매칭 (추가)** — 1차 구현 완료 (`supabase/ratings.sql` 실행 필요)
  - [x] `ratings` 테이블 생성 및 초기 Elo 기본값 **1000** — SQL 스크립트·앱 `DEFAULT_ELO`
  - [x] 승인 시 Elo·전적 DB 반영 — `lib/ratings.ts` `applyEloForApprovedMatch`, `lib/elo.ts` K=20
  - [x] `lib/eloTier.ts` + `TierRosterProvider`: `matches_played`·**`resolveDisplayTier`**(임시 티어 + 상대 티어)
  - [x] `/my-page` 본인 Elo·티어·통산(승인 경기 집계)·최근 10게임·파트너 Top3·티어 구분
  - [x] `/matchs`·`/admin/matchs` 참석자 목록 티어 배지
  - [x] `/match-records` 티어 마크+이름 표시
  - [x] `lib/teamMatching.ts` Snake draft(§5.4)
  - [x] Admin 매치 상세 "팀 자동 생성" 및 추천 결과(티어·Elo 표시)
  - [ ] 필요 시 추천 팀 구성을 `matches`에 자동 저장하는 옵션 추가
  - [ ] (옵션) 티어 경계를 `club_settings`로 옮겨 운영 조정 가능하게 확장

- [ ] **Phase 8 – 선수 프로필 확장 (비핵심 기능)**
  - [ ] Supabase Storage에 `player-photos`(가칭) 버킷 생성
  - [ ] `players` 테이블에 `photo_url`(text, nullable) 컬럼 추가
  - [ ] `/admin/players` 페이지에서 선수별 썸네일/이미지 슬롯 및 사진 업로드/변경 UI 추가
  - [ ] 업로드된 이미지를 Storage에 저장하고, URL을 `photo_url`로 저장
  - [ ] 회원 화면(Participate, Matchs 등)에서 `photo_url`이 있는 경우 선수 사진 아바타 표시

### Phase 1 – 프로젝트 환경 구축

- Next.js(App Router) + TypeScript 프로젝트 생성
- Tailwind CSS 셋업 및 기본 레이아웃/테마 구성
- Supabase 프로젝트 생성 및 환경 변수 설정
- Supabase에 기본 테이블 생성: `players`, `sessions`, `attendance`
- 로컬/프리뷰 환경에서 Supabase 연결 확인

**완료 기준**
- 로컬에서 Next 앱이 Supabase에 연결되고, `sessions` 등을 조회·표시할 수 있는 상태.

### Phase 2 – 선수 관리(Admin)

- `/admin/players` 페이지 구현
  - 선수 목록 조회 테이블
  - 새 선수 추가 폼 (`name`, `phone_last4` → `display_name` 자동 생성)
  - 기존 선수 수정 기능
- Home/Matchs 등에서 사용할 드롭다운이 이 데이터를 기반으로 동작할 수 있도록 API/훅 준비.

**완료 기준**
- 브라우저에서 Admin이 새 선수를 추가하고, 목록에서 바로 확인/수정 가능.

### Phase 3 – 경기 일정 + 참석 신청

- `/admin/matchs` 페이지에서:
  - 매치 목록 조회
  - 매치 생성/수정 모달 구현
- 로그인 + `/participate`에서:
  - **다가오는 `open` 매치 선택 + 로그인 계정으로 참석 신청/취소**
- `/matchs` 페이지에서(로그인 필수):
  - 매치 리스트 및 각 매치의 참석 현황(조인 조회) 표시

**완료 기준**
- 회원이 로그인 후 `/participate`에서 참석 상태를 저장하면, Admin이 `/admin/matchs`와 `/matchs`에서 그 결과를 확인할 수 있음.

### Phase 4 – 출석 체크(관리자)

- `/admin/matchs` 상세 화면을 확장:
  - 해당 매치의 `attendance` 리스트와 각 참석자의 `status`를 수정할 수 있는 UI 제공
  - 경기 당일 실제 출석에 맞게 상태를 `attend/cancel`로 변경 가능

**완료 기준**
- Admin이 매치별 실제 출석 상황을 시스템 상에 반영할 수 있고, 이 데이터가 이후 팀 매칭/통계의 기반이 됨.

### Phase 5 – 경기 기록 & 승인 (추가)

- `/match-entry` 페이지:
  - 로그인 회원 경기 입력, `attend` 인원만 팀 선택, `club_settings`에 따라 `pending` 또는 자동 `approved`
- `/admin/matches` 페이지:
  - 자동 승인 토글, `pending` 경기 리스트, 승인/반려
- `lib/elo.ts`에 Elo 계산 로직 골격 및 승인 시 호출

**완료 기준**
- 회원이 경기 결과를 입력하면(또는 자동 승인 시) 기록이 반영되고, 수동 모드에서는 Admin이 승인/반려할 수 있으며 승인 시 Elo 업데이트 함수가 호출된다.

### Phase 6 – 대관료(총무)

- `supabase/venue_fee.sql`로 `sessions.venue_fee_closed`, `attendance.venue_settled` 추가
- `/admin/venue-fee`: 일정별 참석자 정산 토글·마감 완료/취소

**완료 기준**
- 운영진이 일정별로 대관료 정산 상태를 DB에 반영하고, 마감 후 토글을 잠글 수 있음.

### Phase 7 – Elo·티어 및 팀 매칭 (추가)

- `ratings` 테이블 생성 및 초기 Elo 기본값 **1000**
- `lib/elo.ts`에서 Elo 계산 로직 완성(DB 반영)
- **`lib/eloTier.ts` + `TierRosterProvider`**: 등록게임수 5미만 **임시 티어**; 이상은 전원 Elo 순위로 **Roland Garros (Rising)** 하위 30%, **Wimbledon (Elite)** 상위 30%, **US Open (Pro)** 그 사이(§3.5.1)
- 회원 UI: `/my-page` 본인 Elo·티어·통산·최근 10게임 등; `/matchs` 참석자 티어 배지; `/match-records` 티어 마크
- `lib/teamMatching.ts`에서 팀 매칭 알고리즘 구현(평균 Elo 밸런스 1차, §5.4)
- Admin `/admin/matchs` 매치 상세에 "팀 자동 생성" 버튼:
  - 출석자(`status='attend'`) + Elo·티어 표시와 함께 추천 팀 출력
  - 필요 시 추천 구성을 `matches`에 자동 저장하는 옵션

**완료 기준**
- 승인된 경기 결과에 따라 Elo가 DB에 반영되고, 등록게임수에 따라 **임시 티어 또는 3단 상대 티어**가 일관되게 표시된다.
- Admin이 한 매치의 출석자를 기반으로 자동 팀 구성을 생성·확인할 수 있다.

---

### Phase 8 – 선수 프로필 확장 (비핵심 기능)

- Supabase Storage에 `player-photos`(가칭) 버킷 생성
- `players` 테이블에 `photo_url`(text, nullable) 컬럼 추가
- `/admin/players` 페이지 확장:
  - 각 선수행에 썸네일/이미지 슬롯 추가
  - 선수 상세/수정 영역에 **사진 업로드/변경 버튼** 추가
  - 업로드된 이미지를 Storage에 저장하고, URL을 `photo_url`로 저장
- 회원 화면(Participate, Matchs 등)에서는:
  - `photo_url`이 있는 경우 해당 이미지를 아바타로 표시
  - 없는 경우 기존 `display_name` 기반 이니셜/텍스트 아바타 사용

**완료 기준**
- Admin이 선수별 프로필 사진을 업로드/변경할 수 있고, 회원 화면에서는 선수 사진을 **보기만** 할 수 있음.

---

## UI·회원 네비·랭킹·결과 등록 (2026-03 반영)

- **`MainNav`**: 공개 항목 **My**(`/my-page`)·**참여신청**; 로그인 후 **매치조회**·**결과등록**·**결과조회**·**랭킹** 추가. 줄바꿈 없이 한 행(`flex-nowrap`), 모바일은 작은 타이포·좁은 간격, 필요 시 가로 스크롤(스크롤바 비표시).
- **`/ranking`**: 티어 필터 + 전원 Elo 순 테이블. 열 **# / 선수(티어 마크+이름) / Elo** 를 **가운데 정렬**.
- **`/match-entry`**: 일정 선택 하단의 **선택됨·참석 풀 설명** 및 제출 버튼 아래 **승인 프로세스·스코어 저장 방식** 안내 문구는 제거. 제출 CTA는 **결과 제출**.
- **사용자 매뉴얼 이미지**: `docs/user-manual/user-manual-*.png` (메뉴별 카드). `README.md`에 목록 링크.

---

## 부록 – Supabase 초기 스키마 SQL

아래는 **핵심 테이블 생성용** 통합 예시다. 실제 저장소에서는 `supabase/club_settings.sql`, `supabase/players_role.sql`, `supabase/venue_fee.sql`를 **추가로** 실행해 컬럼·RLS·설정을 맞춘다.

```sql
-- 확장 설치 (uuid 생성용)
create extension if not exists "pgcrypto";

-- players: 선수 정보 (role은 players_role.sql로도 추가 가능)
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone_last4 text not null,
  display_name text not null,
  role text not null default 'member',
  created_at timestamptz not null default now()
);

-- sessions: 매치(경기 일정)
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  location text not null,
  start_time time not null,
  end_time time not null,
  description text,
  status text not null default 'open',
  venue_fee_closed boolean not null default false,
  created_by text,
  created_at timestamptz not null default now()
);

-- attendance: 참석 신청/출석 기록
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  status text not null check (status in ('attend', 'cancel', 'wait')),
  venue_settled boolean not null default false,
  created_at timestamptz not null default now(),
  constraint attendance_session_player_unique unique (session_id, player_id)
);

-- matches: 경기 기록
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  teamA_player1 uuid not null references public.players(id),
  teamA_player2 uuid not null references public.players(id),
  teamB_player1 uuid not null references public.players(id),
  teamB_player2 uuid not null references public.players(id),
  set1_score text not null,
  set2_score text not null,
  set3_score text,
  status text not null check (status in ('pending', 'approved', 'rejected')) default 'pending',
  created_by text not null,
  approved_by text,
  created_at timestamptz not null default now()
);

-- club_settings: 단일 행 플래그 (상세·RLS는 club_settings.sql 권장)
create table if not exists public.club_settings (
  id smallint primary key default 1,
  auto_approve_matches boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint club_settings_singleton check (id = 1)
);
insert into public.club_settings (id, auto_approve_matches) values (1, false)
  on conflict (id) do nothing;

-- ratings: Elo 및 간단 통계 (Phase 7에서 사용)
-- 티어: 등록게임수 5미만 임시 + 그 외 전체 선수 elo 분포 상대 계산(§3.5.1)
create table if not exists public.ratings (
  player_id uuid primary key references public.players(id) on delete cascade,
  elo integer not null default 1000,
  wins integer not null default 0,
  losses integer not null default 0,
  matches_played integer not null default 0,
  updated_at timestamptz not null default now()
);
```

**기존 DB에 컬럼만 추가하는 경우**: `players.role`, `sessions.status`/`venue_fee_closed`, `attendance.venue_settled`는 각각 `players_role.sql`, 매치 관리 마이그레이션, `venue_fee.sql`를 따른다.

