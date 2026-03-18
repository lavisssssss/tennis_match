# dev_history (compact)

> 지금까지 개발·결정 요약. 다른 에이전트/협업용.

## Stack
- Next.js 15 App Router, TS, Tailwind, Supabase(Postgres), anon key (MVP, Auth 미사용)
- Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 용어
- UI/문서: **매치(Matchs)** — DB 테이블명은 그대로 **`sessions`**, FK **`session_id`**
- 경기 기록 테이블: **`matches`** (pending/approved/rejected). 플레이어 FK 컬럼은 DB에서 소문자 **`teama_player1`…`teamb_player2`**

## DB 요약
| 테이블 | 역할 |
|--------|------|
| `players` | name, phone_last4, display_name |
| `sessions` | 매치 일정 + **status**: open / closed / deleted |
| `attendance` | session_id + player_id, attend/wait/cancel |
| `matches` | 복식 4인, set1/2/3_score, status, created_by, approved_by |

## 라우트
| 경로 | 설명 |
|------|------|
| `/` | Home: open 매치 다중 선택 + 참석 |
| `/matchs` | 매치 목록·참석 현황 (deleted 제외) |
| `/match-entry` | 경기 입력 → matches pending (일정은 **open만**) |
| `/match-records` | 일정 선택 → **approved**만, 이름은 `players.name`, Winner 배지 |
| `/admin`, `/admin/players`, `/admin/matchs`, `/admin/matches` | 관리·승인 |
| 리다이렉트 | `/sessions`→`/matchs`, `/admin/sessions`→`/admin/matchs` |

## Phase 완료 요약
- **1–2**: 환경, 선수 CRUD
- **3**: 매치 CRUD, Home 참석, `/matchs` 목록·출석 조인
- **4**: `/admin/matchs` 참석 수정·추가
- **5**: match-entry(게임수 0–6, 동점 가능), admin 승인/반려, elo 골격(동점은 Elo 스킵), match-records

## 운영/이슈
- **Win + OneDrive**: `.next` readlink `EINVAL` → `npm run dev` 전 `.next` 삭제(스크립트 적용), 또는 프로젝트를 OneDrive 밖으로
- **GitHub push**: `node_modules`·`.next` 제외 필수; `.gitignore`는 **UTF-8** (UTF-16이면 무시 안 됨)
- Remote: `https://github.com/lavisssssss/tennis_match.git` — 소스만 push, clone 후 `npm install`

## 미구현(PLAN 기준)
- Phase 6: ratings, Elo DB 반영, 팀 매칭
- Phase 7: 선수 사진 Storage
