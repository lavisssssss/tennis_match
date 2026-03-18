## 1. 프로젝트 개요

이 문서는 테니스 동호회 경기 운영을 위한 웹 서비스 **Tennis Club Match Manager**의 MVP 개발 계획을 정리한 것이다.  
서비스는 다음을 목표로 한다.

- **경기 일정 공지**: 다음/향후 경기 **매치**(경기 일정) 정보를 한눈에 확인
- **참석 신청 및 출석 관리**: 동호회원이 간단히 참석 여부를 표시하고, Admin이 실제 출석을 관리
- **경기 기록 및 승인**(MVP 이후): Guest가 경기 결과를 입력하고, Admin이 승인
- **Elo 기반 실력 추정**(MVP 이후): 경기 결과를 바탕으로 선수별 실력 수치화
- **실력 기반 팀 매칭**(MVP 이후): 참석자들의 Elo를 기준으로 균형 잡힌 복식 팀 구성

MVP 단계에서는 **경기 일정 + 참석 신청/출석 관리**를 우선 구현하고, 이후 단계적으로 경기 기록, Elo, 팀 매칭 기능을 확장한다.

- **Frontend**: Next.js (App Router) + TypeScript
- **UI**: Tailwind CSS
- **Database**: Supabase (Postgres) – Auth는 사용하지 않고, **DB만 사용**
- **Hosting**: Vercel (Next.js 배포)

---

## 2. 아키텍처 개요

### 2.1 전체 구조

- **사용자(Guest/Admin)** → 브라우저
- 브라우저 → **Next.js 웹 앱 (Vercel 호스팅)**
- Next.js 앱 → **Supabase(Postgres) 데이터베이스**

회원가입/로그인은 도입하지 않고, **모든 쓰기 작업은 Supabase의 Public anon key를 사용하는 클라이언트 호출**을 전제로 한다.  
민감한 관리 기능(Admin 화면)은 **특정 URL 키 또는 간단한 토글**을 통해 보호한다(추후 필요 시 Supabase Auth + RLS로 강화 가능).

#### 개념도 (텍스트)

- Guest: Home / Matchs / Match Entry(추가 단계) 페이지 사용
- Admin: Admin Dashboard 및 하위 관리 페이지 사용
- 모든 페이지는 **Supabase JS SDK**를 통해 Postgres 테이블(`players`, `sessions`, `attendance`, `matches`, `ratings`)을 직접 읽고/쓴다.

### 2.2 디렉터리 구조(초안)

- `app/`
  - `layout.tsx` : 공통 레이아웃(헤더, 네비게이션, 폰트/색상 기본 스타일)
  - `page.tsx` : Home – 다음 경기 1개 + 참석 신청
  - `matchs/`
    - `page.tsx` : 매치 목록 + 매치별 참석 현황
  - `match-entry/` (MVP 이후)
    - `page.tsx` : 경기 결과 입력
  - `admin/`
    - `page.tsx` : Admin 대시보드(관리 메뉴 링크)
    - `players/`
      - `page.tsx` : 선수 등록/수정
    - `matchs/`
      - `page.tsx` : 매치 생성/수정 + 출석 체크
    - `matches/` (MVP 이후)
      - `page.tsx` : 경기 승인(Elo 반영 트리거)
  - `api/` (선택) : 필요한 경우 서버 액션/Route Handler로 Supabase 호출 래핑

- `lib/`
  - `supabaseClient.ts` : Supabase 클라이언트 인스턴스 생성
  - `elo.ts` : Elo 계산 로직 (MVP 이후)
  - `teamMatching.ts` : 팀 매칭 알고리즘 (MVP 이후)

---

## 3. 데이터베이스 스키마 (Supabase)

PRD의 데이터 모델(9장)을 기준으로 Supabase Postgres에 다음 테이블을 생성한다.

### 3.1 `players` – 선수 정보

- **컬럼**
  - `id` (uuid, PK)
  - `name` (text) – 실이름, 예: `"오형선"`
  - `phone_last4` (text) – 연락처 뒷자리 4자리, 예: `"4025"`
  - `display_name` (text) – 화면 표기용, 예: `"오형선4025"`
  - `created_at` (timestamptz, default `now()`)
- **설명**
  - 모든 드롭다운에서 `display_name`을 사용한다.
  - 선수 등록/수정은 Admin 전용 기능이다.

### 3.2 `sessions` – 매치(경기 일정)

- **컬럼**
  - `id` (uuid, PK)
  - `date` (date) – 경기 날짜
  - `location` (text) – 경기 장소
  - `start_time` (time) – 시작 시간
  - `end_time` (time) – 종료 시간
  - `description` (text, nullable) – 추가 설명
  - `created_by` (text 또는 uuid, nullable) – 생성자 식별용
  - `created_at` (timestamptz, default `now()`)
- **설명**
  - Home/Matchs 페이지에서 공지되는 기본 단위.
  - Admin이 `/admin/matchs`에서 생성/수정한다.

### 3.3 `attendance` – 참석 신청/출석 기록

- **컬럼**
  - `id` (uuid, PK)
  - `session_id` (uuid, FK → `sessions.id`)
  - `player_id` (uuid, FK → `players.id`)
  - `status` (text) – `attend` | `cancel` | `wait`
  - `created_at` (timestamptz, default `now()`)
- **제약 및 규칙**
  - `UNIQUE (session_id, player_id)` – 한 매치당 한 선수는 한 줄만 존재.
  - 사용자는 Home 페이지에서 자신의 이름/상태를 선택해 이 테이블을 `upsert`한다.
  - Admin은 경기 당일 실제 출석 확인용으로 `status` 값을 조정할 수 있다.

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
  - Guest가 Match Entry 페이지에서 입력하면 기본 상태는 `pending`.
  - Admin이 `/admin/matches`에서 승인/반려를 결정한다.

### 3.5 `ratings` – Elo 및 통계 (MVP 이후)

- **컬럼**
  - `player_id` (uuid, PK, FK → `players.id`)
  - `elo` (integer, default `100`)
  - `wins` (integer, default `0`)
  - `losses` (integer, default `0`)
  - `matches_played` (integer, default `0`)
  - `updated_at` (timestamptz, default `now()`)
- **설명**
  - 각 선수당 한 줄만 존재(1:1).
  - 경기 승인 시 Elo와 간단한 카운터 통계를 함께 업데이트한다.

---

## 4. 페이지 설계

### 4.1 Home (`app/page.tsx`)

- **목표**
  - 가장 가까운 다음 경기 1개를 표시하고, Guest가 **이름 + 참석 상태**를 선택해 저장할 수 있게 한다.
- **화면 요소**
  - 다음 경기 카드
    - 날짜, 장소, 시간, 설명
  - `이름 선택` 드롭다운
    - `players.display_name` 목록
  - `참석 상태` 드롭다운
    - `attend / cancel / wait`
  - `저장` 버튼
  - 저장 후 간단한 알림(Toast)
- **데이터 사용**
  - `sessions`: 오늘 이후 경기 매치 목록(표시/선택용)
  - `players`: 전체 선수 목록
  - `attendance`: 선택한 매치와 플레이어 조합의 현재 상태 조회/업데이트

### 4.2 Matchs 목록 (`app/matchs/page.tsx`)

- **목표**
  - 과거/미래 경기 매치를 리스트로 보여주고, 각 매치의 참석 현황을 한눈에 확인.
- **화면 요소**
  - 매치 리스트
    - 날짜, 장소, 시간, 설명
    - (옵션) 탭: `다가오는 경기 / 지난 경기`
  - 매치 선택 시 상세 패널/영역
    - 매치 기본 정보
    - 참석자 목록
      - `display_name` + `status(attend/cancel/wait)`
- **데이터 사용**
  - `sessions`
  - `attendance` + `players` 조인

### 4.3 Match Entry (`app/match-entry/page.tsx`) – MVP 이후

- **목표**
  - Guest가 복식 경기 결과를 간단히 입력할 수 있게 한다.
- **화면 요소**
  - `매치 선택` 드롭다운 (`sessions`)
  - `Team A`
    - Player 1 / Player 2 드롭다운 (`players`)
  - `Team B`
    - Player 3 / Player 4 드롭다운 (`players`)
  - 세트 스코어 입력 필드
    - Set 1, Set 2 (필수)
    - Set 3 (선택)
  - `저장` 버튼
- **데이터 사용**
  - `sessions`, `players` 조회
  - 저장 시 `matches`에 `status = 'pending'`으로 insert

### 4.4 Admin Dashboard (`app/admin/page.tsx`)

- **목표**
  - Admin이 주요 관리 기능에 접근하는 허브 역할.
- **화면 요소**
  - 간단한 카드/버튼 목록
    - `선수 관리` → `/admin/players`
    - `매치(경기 일정)/출석 관리` → `/admin/matchs`
    - `경기 승인` → `/admin/matches` (MVP 이후)
    - (추후) `Elo / 팀 매칭 통계`
- **접근 제어(간단 버전)**
  - 예: `/admin?key=SECRET_KEY`와 같이 쿼리 파라미터 기반 가드 또는 간단한 환경변수 체크.

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
- **데이터 사용**
  - `sessions` 목록 조회 및 insert/update
  - `attendance` + `players` 조인 조회
  - 출석 상태 update

### 4.7 Admin – 경기 승인 (`app/admin/matches/page.tsx`) – MVP 이후

- **목표**
  - Guest가 입력한 `pending` 경기를 검토하여 `approved` / `rejected`로 상태를 변경하고, 승인 시 Elo 계산을 수행한다.
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

### 5.1 참석 신청 흐름 (Home)

1. 페이지 로드 시:
   - Supabase에서 오늘 이후의 `sessions`(매치) 목록을 조회한다.
   - `players` 전체 목록을 조회하여 이름 드롭다운을 구성한다.
2. 사용자가
   - `이름`(player_id) 선택
   - `참석 상태`(status: `attend/cancel/wait`) 선택
3. `저장` 버튼 클릭 시:
   - `attendance` 테이블에 `{ session_id, player_id, status }`로 **upsert** 수행  
     (같은 `(session_id, player_id)`가 있으면 update, 없으면 insert).
4. 성공 시:
   - 간단한 Toast/메시지 표시
   - 필요 시 UI에서 현재 상태를 다시 표시.

### 5.2 출석 체크 흐름 (Admin 매치 상세)

1. Admin이 `/admin/matchs`에서 특정 매치를 선택한다.
2. 해당 매치의 `attendance` + `players` 조인 결과를 조회해 리스트로 보여준다.
3. 경기 당일 실제 상황에 맞게 각 row의 `status`를 `attend` 또는 `cancel` 등으로 수정한다.
4. 변경 사항은 곧바로 `attendance` update로 반영되고, 이후 **팀 매칭 및 통계의 기준 데이터**가 된다.

### 5.3 경기 기록 및 승인 + Elo 업데이트 (MVP 이후)

#### 5.3.1 경기 기록 입력 (Match Entry)

1. Guest가 Match Entry 페이지에 접속.
2. `sessions`, `players` 목록을 불러와 매치와 4명의 선수를 선택한다.
3. 세트 스코어를 입력한다(예: `"6-4"`, `"6-2"`, 필요 시 3세트).
4. 저장 시:
   - `matches` 테이블에 `status = 'pending'`으로 insert.

#### 5.3.2 경기 승인 흐름 (Admin)

1. Admin이 `/admin/matches`에서 `status = 'pending'` 경기 리스트를 조회.
2. 특정 경기를 선택해 팀 구성과 스코어를 확인.
3. 경기 결과가 유효하면:
   - `matches.status`를 `approved`로 update.
   - `lib/elo.ts`에 정의된 Elo 계산 함수를 호출하여 네 명의 선수에 대한 Elo를 재계산.
4. 문제가 있는 경우:
   - `matches.status`를 `rejected`로 변경하거나, 필요 시 수정 후 다시 저장.

#### 5.3.3 Elo 계산 로직 개요

- 각 선수는 `ratings.elo` 점수를 가진다(초기값 100).
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

### 5.4 팀 매칭 로직 개요 (MVP 이후)

- **목표**: 특정 매치에서 `status = 'attend'`인 출석자들을 입력으로 받아, **팀 평균 Elo 차이를 최소화**하는 복식 팀을 제안한다.

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
- Admin UI:
  - "팀 자동 생성" 버튼 클릭 시 이 결과를 화면에 보여주고, 필요 시 `matches`에 자동 저장하는 기능으로 확장 가능.

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
  - [x] Home(`app/page.tsx`)에서 다가오는 매치 선택 + 참석 신청/취소 기능 구현
  - [x] `/matchs` 페이지에서 매치 리스트 및 각 매치의 참석 현황(조인 조회) 표시

- [x] **Phase 4 – 출석 체크(관리자)**
  - [x] `/admin/matchs` 상세 화면에서 해당 매치의 `attendance` 리스트 표시
  - [x] 각 참석자의 `status`를 수정할 수 있는 UI 제공
  - [x] 경기 당일 실제 출석에 맞게 상태를 `attend/cancel`로 변경 가능하도록 처리

- [x] **Phase 5 – 경기 기록 & 승인 (추가)**
  - [x] `/match-entry` 페이지에서 Guest 경기 입력 폼 구현 (`matches.pending` 생성)
  - [x] `/admin/matches` 페이지에서 `pending` 경기 리스트 및 승인/반려 버튼 구현
  - [x] `lib/elo.ts`에 Elo 계산 로직 골격 구현 및 함수 인터페이스 정의

- [ ] **Phase 6 – Elo 및 팀 매칭 (추가)**
  - [ ] `ratings` 테이블 생성 및 초기 데이터 세팅(Elo = 100)
  - [ ] `lib/elo.ts`에서 Elo 계산 로직 완성
  - [ ] `lib/teamMatching.ts`에서 팀 매칭 알고리즘 구현
  - [ ] Admin 매치 상세 화면에 "팀 자동 생성" 버튼 추가 및 팀 추천 결과 표시
  - [ ] 필요 시 추천 팀 구성을 `matches`에 자동 저장하는 옵션 추가

- [ ] **Phase 7 – 선수 프로필 확장 (비핵심 기능)**
  - [ ] Supabase Storage에 `player-photos`(가칭) 버킷 생성
  - [ ] `players` 테이블에 `photo_url`(text, nullable) 컬럼 추가
  - [ ] `/admin/players` 페이지에서 선수별 썸네일/이미지 슬롯 및 사진 업로드/변경 UI 추가
  - [ ] 업로드된 이미지를 Storage에 저장하고, URL을 `photo_url`로 저장
  - [ ] Guest 화면(Home, Matchs 등)에서 `photo_url`이 있는 경우 선수 사진 아바타 표시

### Phase 1 – 프로젝트 환경 구축

- Next.js(App Router) + TypeScript 프로젝트 생성
- Tailwind CSS 셋업 및 기본 레이아웃/테마 구성
- Supabase 프로젝트 생성 및 환경 변수 설정
- Supabase에 기본 테이블 생성: `players`, `sessions`, `attendance`
- 로컬/프리뷰 환경에서 Supabase 연결 확인

**완료 기준**
- Home에서 Supabase에 간단히 `sessions`를 조회해 콘솔에 출력할 수 있는 상태.

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
- Home(`app/page.tsx`)에서:
  - **다가오는 매치 선택 + 참석 신청/취소 기능** 구현
- `/matchs` 페이지에서:
  - 매치 리스트 및 각 매치의 참석 현황(조인 조회) 표시

**완료 기준**
- 실제 동호회원이 Home 페이지에서 이름/참석 상태를 선택하여 저장하면, Admin이 `/admin/matchs`와 `/matchs`에서 그 결과를 확인할 수 있음.

### Phase 4 – 출석 체크(관리자)

- `/admin/matchs` 상세 화면을 확장:
  - 해당 매치의 `attendance` 리스트와 각 참석자의 `status`를 수정할 수 있는 UI 제공
  - 경기 당일 실제 출석에 맞게 상태를 `attend/cancel`로 변경 가능

**완료 기준**
- Admin이 매치별 실제 출석 상황을 시스템 상에 반영할 수 있고, 이 데이터가 이후 팀 매칭/통계의 기반이 됨.

### Phase 5 – 경기 기록 & 승인 (추가)

- `/match-entry` 페이지:
  - Guest 경기 입력 폼 구현 (`matches.pending` 생성)
- `/admin/matches` 페이지:
  - `pending` 경기 리스트
  - 승인/반려 버튼
- `lib/elo.ts`에 Elo 계산 로직 골격 구현:
  - 아직 실제 Elo 업데이트는 단순화해도 되지만, 함수 인터페이스를 정의해 둔다.

**완료 기준**
- Guest가 경기 결과를 입력하면 Admin이 이를 승인 또는 반려할 수 있고, 승인 시 Elo 업데이트 함수가 호출된다(내부 로직은 1차 버전이라도 동작).

### Phase 6 – Elo 및 팀 매칭 (추가)

- `ratings` 테이블 생성 및 초기 데이터 세팅(Elo = 100)
- `lib/elo.ts`에서 Elo 계산 로직 완성
- `lib/teamMatching.ts`에서 팀 매칭 알고리즘 구현
- Admin 매치 상세 화면에 "팀 자동 생성" 버튼 추가:
  - 현재 출석자(`status='attend'`)를 기반으로 팀 추천 결과를 화면에 뿌림
  - 필요 시 추천 팀 구성을 `matches`에 자동 저장하는 옵션 추가

**완료 기준**
- 승인된 경기 결과에 따라 Elo가 갱신되고, Admin이 한 매치의 출석자를 기반으로 자동 팀 구성을 생성할 수 있음.

---

### Phase 7 – 선수 프로필 확장 (비핵심 기능)

- Supabase Storage에 `player-photos`(가칭) 버킷 생성
- `players` 테이블에 `photo_url`(text, nullable) 컬럼 추가
- `/admin/players` 페이지 확장:
  - 각 선수행에 썸네일/이미지 슬롯 추가
  - 선수 상세/수정 영역에 **사진 업로드/변경 버튼** 추가
  - 업로드된 이미지를 Storage에 저장하고, URL을 `photo_url`로 저장
- Guest 화면(Home, Matchs 등)에서는:
  - `photo_url`이 있는 경우 해당 이미지를 아바타로 표시
  - 없는 경우 기존 `display_name` 기반 이니셜/텍스트 아바타 사용

**완료 기준**
- Admin이 선수별 프로필 사진을 업로드/변경할 수 있고, Guest는 Home/Matchs 등에서 선수 사진을 **보기만** 할 수 있음.

---

## 부록 – Supabase 초기 스키마 SQL

아래 SQL을 Supabase 대시보드의 SQL Editor에 그대로 실행하면, PRD/PLAN에서 정의한 핵심 테이블들을 한 번에 생성할 수 있다.  
(`public` 스키마 기준, 기존에 같은 이름의 테이블이 없다면 그대로 사용 가능)

```sql
-- 확장 설치 (uuid 생성용)
create extension if not exists "pgcrypto";

-- players: 선수 정보
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone_last4 text not null,
  display_name text not null,
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
  created_by text,
  created_at timestamptz not null default now()
);

-- attendance: 참석 신청/출석 기록
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  status text not null check (status in ('attend', 'cancel', 'wait')),
  created_at timestamptz not null default now(),
  constraint attendance_session_player_unique unique (session_id, player_id)
);

-- matches: 경기 기록 (MVP 이후)
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

-- ratings: Elo 및 간단 통계 (MVP 이후)
create table if not exists public.ratings (
  player_id uuid primary key references public.players(id) on delete cascade,
  elo integer not null default 100,
  wins integer not null default 0,
  losses integer not null default 0,
  matches_played integer not null default 0,
  updated_at timestamptz not null default now()
);
```

