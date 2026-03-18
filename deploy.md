# Vercel 배포 가이드 (LGES Tennis Manager)

Next.js 15 앱을 Vercel에 배포할 때의 체크리스트입니다.

## 사전 준비

1. **Git 저장소**  
   - GitHub / GitLab / Bitbucket 등에 코드를 푸시해 두세요.  
   - (로컬만 쓰는 경우) Vercel CLI로도 배포 가능하지만, 연동 배포는 원격 저장소가 필요합니다.

2. **Supabase 프로젝트**  
   - [Supabase](https://supabase.com)에서 프로젝트를 만들고, DB·RLS·테이블이 PRD/PLAN에 맞게 준비되어 있어야 합니다.

3. **Vercel 계정**  
   - [vercel.com](https://vercel.com) 가입 후 Git 제공자와 연동합니다.

---

## 1. Vercel에 프로젝트 연결

1. Vercel 대시보드 → **Add New… → Project**
2. 저장소 **Import** 선택
3. **Framework Preset**: `Next.js` (자동 감지)
4. **Root Directory**: 모노레포가 아니면 비워 둠 (저장소 루트 = `tennis_elo` 루트)
5. **Build Command**: `next build` (기본값)
6. **Output Directory**: 기본값 사용 (Next.js가 처리)
7. **Install Command**: `npm install` 또는 `pnpm install` / `yarn` (팀 규칙에 맞게)

로컬 `package.json`의 `dev` 스크립트는 `.next` 삭제 후 개발 서버만 쓰는 용도입니다. **Vercel 빌드는 `npm run build` → `next build`만 사용**하면 됩니다.

---

## 2. 환경 변수 (필수)

Vercel 프로젝트 → **Settings → Environment Variables**에서 아래를 등록합니다.

| 이름 | 설명 | 적용 환경 |
|------|------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase **anon public** 키 | Production, Preview, Development |

값은 로컬 `.env.local` 또는 Supabase 대시보드 **Project Settings → API**에서 확인합니다.

- `.env.local.example` 참고:
  - `NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...`

**주의**

- `NEXT_PUBLIC_*` 는 브라우저에 노출됩니다. **service_role** 키는 넣지 마세요.
- 변수 수정 후에는 **Redeploy**가 필요할 수 있습니다.

---

## 3. 배포 후 Supabase 설정

1. **Authentication → URL Configuration** (해당 기능 사용 시)  
   - Site URL / Redirect URL에 Vercel 도메인 추가  
   - 예: `https://your-app.vercel.app`

2. **Supabase → Project Settings → API**  
   - CORS는 일반적으로 Supabase가 허용하지만, 문제가 있으면 Vercel URL이 차단되지 않았는지 확인합니다.

---

## 4. 배포 확인

1. Vercel이 제공하는 URL(예: `https://xxx.vercel.app`) 접속
2. **참여 신청 / 매치 조회** 등에서 Supabase 연동이 되는지 확인
3. 빌드 로그에 **Build Failed**가 없는지 확인

로컬과 동일하게 동작하려면 **Production**에도 위 환경 변수가 반드시 들어가 있어야 합니다.

---

## 5. 커스텀 도메인 (선택)

1. Vercel 프로젝트 → **Settings → Domains**
2. 도메인 추가 후 DNS(CNAME/A) 안내에 따라 설정
3. SSL은 Vercel이 자동 발급

---

## 6. 자주 있는 이슈

| 증상 | 점검 |
|------|------|
| 빌드는 되는데 앱에서 DB 오류 | `NEXT_PUBLIC_SUPABASE_*` 오타, Production에 변수 미설정 |
| 한글/폰트 문제 | Google Fonts는 외부 CDN 사용 — 방화벽/차단 여부 확인 |
| 404 on refresh | Next App Router는 기본적으로 정적보내기가 아님 — Vercel은 Next 서버로 처리하므로 일반적으로 문제 없음 |

---

## 7. CLI로 배포 (선택)

```bash
npm i -g vercel
vercel login
vercel        # 프리뷰
vercel --prod # 프로덕션
```

CLI 사용 시에도 대시보드와 동일하게 환경 변수를 설정하거나, `vercel env pull`로 로컬에 맞출 수 있습니다.

---

## 요약 체크리스트

- [ ] Git 원격 저장소에 푸시 완료  
- [ ] Vercel에서 저장소 Import, Framework = Next.js  
- [ ] `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` 설정 (Production·Preview)  
- [ ] 배포 URL에서 동작 확인  
- [ ] (선택) 커스텀 도메인·Supabase Redirect URL 반영  

배포 준비가 끝났습니다.
