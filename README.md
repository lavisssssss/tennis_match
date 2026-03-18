## Tennis Match Manager (테니스 동호회 매칭/경기 관리)

테니스 동호회 운영을 위해 만든 **매치 일정·참석·경기 기록 관리 웹앱**입니다.  
Next.js(App Router) + Supabase(Postgres) 기반으로, **모바일에서 손쉽게 경기 신청·출석·기록**을 남기는 것을 목표로 합니다.

---

## 기술 스택

- **Frontend**
  - Next.js 15 (App Router, TypeScript)
  - React 18
  - Tailwind CSS (모바일 우선 UI)
- **Backend / DB**
  - Supabase (Postgres, @supabase/supabase-js v2)
  - 테이블: `players`, `sessions`(매치 일정), `attendance`, `matches`(경기 기록)

---

## 핵심 기능

### 1) 선수 관리 (Admin, Phase 2)

- 경로: `/admin/players`
- 기능:
  - 선수 목록 조회
  - 새 선수 추가 (`name`, `phone_last4` 입력 → `display_name` 자동 생성)
  - 기존 선수 수정
- 이 데이터는 **드롭다운에서 선수 선택**에 재사용됩니다.

### 2) 매치 일정 + 참석 신청 (Phase 3)

#### Admin – 매치 일정 관리
- 경로: `/admin/matchs`
- 기능:
  - 매치(경기 일정) 목록 조회 (최근 날짜 우선)
  - 새 매치 생성 / 기존 매치 수정
  - 매치 상태 관리:
    - **진행(open)** / **종료(closed)** / **삭제(deleted, 소프트 삭제)**
    - 종료/삭제된 매치는 Home/게스트 화면에서 제외
  - 매치별 참석 관리(Phase 4와 연계)

#### Guest – Home 참석 신청
- 경로: `/`
- 기능:
  - 다가오는 **여러 개의 `open` 매치** 중 하나 선택
  - 플레이어 선택 + 참석 상태(`attend`/`wait`/`cancel`) 저장
  - 선택한 매치/플레이어 조합으로 기존 참석 상태를 불러와 갱신

#### Guest – 매치 목록/참석 현황
- 경로: `/matchs`
- 기능:
  - `open`/`closed` 매치 리스트 조회 (`deleted`는 제외)
  - 매치를 탭하면 해당 매치의 참석 현황(참석/대기/취소 인원) 표시

### 3) 출석 체크 (Admin, Phase 4)

- 경로: `/admin/matchs` (매치 카드의 “참석관리” 패널)
- 기능:
  - 매치별 `attendance` 목록 조회 (선수 이름 조인)
  - 각 참석자의 상태를 `attend` / `wait` / `cancel` 로 변경
  - 추가 참석자 등록 (선수 + 상태 선택 후 upsert)

---

## 경기 기록 & 승인 (Phase 5)

### 1) Guest – 경기 결과 입력

- 경로: `/match-entry`
- 기능:
  - **입력자 선택**: 플레이어 드롭다운에서 입력자를 선택하면 Team A의 A1으로 자동 설정
  - **매치 일정 선택**: `sessions.status='open'` 인 매치만 드롭다운에 표시
  - **선수 선택**:
    - Team A/B 각각 2명씩 선택 (총 4명, **중복 불가**)
    - 이미 선택된 선수는 다른 드롭다운에서 옵션에서 제외
  - **스코어 입력(간단 모드)**:
    - Team A/B의 **승리 게임 수(0~6)** 를 버튼으로 선택
    - DB에는 `set1_score = "{A}-{B}"`, `set2_score`도 동일 값 저장, `set3_score`는 현재 미사용
    - 동점도 허용 (이 경우 Elo 계산은 건너뜀)
  - 저장 시:
    - `matches` 테이블에 **`status='pending'`** 으로 경기 기록 생성
    - `created_by`에는 입력자 선수의 `display_name` 저장

### 2) Admin – 경기 기록 승인/반려

- 경로: `/admin/matches`
- 기능:
  - `matches.status='pending'` 인 기록 목록 조회
  - 각 행에서:
    - 매치 일정 정보 (날짜/시간/장소)
    - 입력자, 입력 시각
    - Team A/B 선수 이름 (선수 테이블 조인)
    - 스코어
  - **승인자 선택**:
    - 플레이어 드롭다운에서 승인자 선택 (선택 전에는 “승인” 버튼 비활성화)
  - 승인:
    - `status='approved'`, `approved_by`에 승인자 이름 저장
    - `lib/elo.ts` 의 `onMatchApproved()` 호출 (Phase 5 1차 버전)
      - 현재는 Elo=100 가정으로 델타 계산만 수행, 실제 Elo 반영은 Phase 6에서 확장
    - 동점인 경우: 승패 판정 불가 → Elo 델타 0, 안내 메시지 (`동점 · Elo 반영 없음`)
  - 반려:
    - `status='rejected'`, `approved_by`는 null

### 3) Guest – 승인된 경기 기록 조회

- 경로: `/match-records`
- 기능:
  - 매치 일정 선택 (open/closed 매치 모두 조회 대상)
  - 해당 매치의 **승인된 경기 기록(approved)** 을 한 줄씩 표시:
    - 형식:  
      - `Winner [조용원·김슬기 4 : 5 이남규·오형선]`  
      - `[조용원·김슬기 6 : 0 이남규·오형선] Winner`
    - 왼쪽/오른쪽 끝에 `Winner` 배지를 붙이고, 가운데에는 결과 텍스트를 중앙 정렬로 표시
  - 선수 이름은 `players.name`(이름만)을 사용, 휴대폰 뒷자리는 노출하지 않음

---

## DB 스키마 요약

### players
- `id` (uuid, PK)
- `name` (text) – 선수 이름
- `phone_last4` (text) – 휴대폰 뒷 4자리
- `display_name` (text) – 이름+뒷4자리 (예: 홍길동1234)
- `created_at` (timestamptz)

### sessions (매치 일정)
- `id` (uuid, PK)
- `date` (date)
- `location` (text)
- `start_time` (time)
- `end_time` (time)
- `description` (text, nullable)
- `status` (text) – `open` / `closed` / `deleted`
- `created_by` (text, nullable)
- `created_at` (timestamptz)

### attendance
- `id` (uuid, PK)
- `session_id` (uuid, FK → sessions.id)
- `player_id` (uuid, FK → players.id)
- `status` (text) – `attend` / `cancel` / `wait`
- `created_at` (timestamptz)
- `UNIQUE (session_id, player_id)`

### matches (경기 기록)
- `id` (uuid, PK)
- `session_id` (uuid, FK → sessions.id, on delete cascade)
- `teama_player1` / `teama_player2` (uuid, FK → players.id)
- `teamb_player1` / `teamb_player2` (uuid, FK → players.id)
- `set1_score` / `set2_score` (text, 예: `"4-2"`)
- `set3_score` (text, nullable)
- `status` (text) – `pending` / `approved` / `rejected`
- `created_by` (text) – 입력자
- `approved_by` (text, nullable) – 승인자
- `created_at` (timestamptz)

---

## 로컬 개발 방법

### 1) 의존성 설치

```bash
npm install
```

### 2) 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 만들고 Supabase 프로젝트 정보를 채웁니다.

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3) 개발 서버 실행

```bash
npm run dev
```

> **참고 (Windows + OneDrive)**  
> 이 프로젝트는 `npm run dev` 실행 시 매번 `.next` 디렉터리를 자동 삭제하도록 스크립트를 구성했습니다.  
> OneDrive 경로에서 Next.js가 `.next` 내부 파일을 `readlink` 하다가 `EINVAL` 에러가 나는 문제를 회피하기 위함입니다.

브라우저에서 `http://localhost:3000` 접속 후 화면을 확인합니다.

---

## 배포

일반적인 Next.js 앱과 동일하게 Vercel 등으로 배포할 수 있습니다.  
Supabase 프로젝트 URL/키를 **환경 변수**로 설정해야 합니다.

