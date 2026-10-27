# kilo

인바디로 목표 잡고, 사진으로 기록하는 개인용 식단·운동 PWA.

- **홈** — 아바타+인사 헤더, 달력(주/월 전환, 날짜별 식단 상태 점 + 운동 표시) → 날짜 고르면 그 날 총평 → 2×2 타일(칼로리 링·물 링·단백질 7일 막대·운동 볼륨 스파크라인) → 탄수/지방/나트륨 → 식사·운동 카드. 과거 조회·과거 기록 추가는 여기서만.
- **식단** — 오늘만. 자주 먹는 식단(즐겨찾기) 탭 한 번에 기록, 사진 찍으면 AI가 음식·양·칼로리 읽음 → 확인하고 저장.
- **운동** — 오늘만. 바디맵(앞/뒤)에 오늘 자극 부위 표시, 종목 카드에 실제 기구 동작, 지난번 무게 자동 채움, 좌/우 편측 기록. **분석** 탭: 부위별 세트(이번 주/지난 주), 주간 볼륨 8주, 종목별 1RM 추세.
- **마이** — 인바디 결과지 사진 → 자동 입력 → 목표 칼로리/매크로, 2주 간격 보정 제안, 기록 추세

색: 흑백 바탕(`--accent: #111`)에 포인트만. 홈 타일 4색 — 칼로리 주황 / 물 파랑 / 단백질 초록 / 운동 보라(아이콘·라벨·그래프, 숫자는 검정). 매크로 신호등 — 탄수 노랑 / 단백질 초록 / 지방 빨강. 칼로리는 초과 시에만 빨강. 바디맵 자극 부위는 주황. 전부 `app/globals.css` `:root` 토큰.

## 실행

```bash
npm install
npm run dev      # http://localhost:3000
npm test
npm run lint     # eslint (next/core-web-vitals + typescript)
```

**키 없이도 돌아감.** Supabase 없으면 "이 기기에만 저장"(localStorage) 모드, AI 키 없으면 식단·인바디는 수동 입력.
폰에서: 같은 와이파이에서 `http://<맥IP>:3000` → 홈 화면에 추가.

## 설정 (선택)

`.env.example` → `.env.local`

| 키 | 역할 | 없으면 |
|---|---|---|
| `GOOGLE_API_KEY` **또는** `ANTHROPIC_API_KEY` | 식단 사진 파싱, 인바디 결과지 읽기, 하루 총평. 둘 다 있으면 Google 우선 | 수동 입력 |
| `AI_MODEL` | 모델 덮어쓰기. 기본 `gemini-2.5-flash` / `claude-haiku-5-5` | — |
| `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` | SSO 로그인 + 클라우드 저장 | 로컬 저장 |
| `MFDS_API_KEY` | 식약처 식품영양성분DB 검색 (음식 행의 "DB" 버튼) | AI 추정값만 |
| `NEXT_PUBLIC_SITE_URL` | SEO canonical/OG 주소 | Vercel 도메인 → localhost 추정 |
| `AI_DAILY_PHOTO_LIMIT` / `AI_DAILY_SUMMARY_LIMIT` / `FOOD_DAILY_LIMIT` | 브라우저별 일일 상한 (기본 20 / 3 / 100) | 기본값 |
| `AI_LIMIT_SECRET` | 사용량 쿠키 서명 키 | AI 키에서 파생 |
| `AI_ALLOW_GUEST` | Supabase 켠 상태에서 게스트에게도 AI 허용 (`1`) | 로그인 사용자만 |

### API 보호와 비용

`/api/*` 는 로그인 세션이나 게스트 쿠키가 없으면 401. Supabase를 켜면 사진 분석·총평은 **로그인 사용자만** 쓸 수 있다(게스트는 403, `AI_ALLOW_GUEST=1`이면 허용). 그 위에 IP당 분당 버스트 제한, 브라우저별 일일 상한(서명 쿠키 `kilo-ai-quota`, 한국 시간 자정 리셋)이 걸린다. 한도에 닿으면 429와 안내 문구.

모델을 부를 때마다 stdout에 JSON 한 줄을 남긴다 — Vercel Logs나 터미널에서 `ai_usage` 로 찾으면 된다.

```json
{"t":"ai_usage","at":"…","route":"meal/parse","who":"user:1a2b3c4d","provider":"gemini","model":"gemini-2.5-flash","in":1843,"out":212,"ms":2210,"ok":true,"usd":0.001083}
```

`usd` 는 `lib/ai-usage.ts` 의 단가표로 계산한 추정치다. 월 예산 감은 여기서 잡으면 된다.

### iOS 홈 화면 앱에서 로그인

iOS는 홈 화면에 추가한 앱에서 OAuth를 시작하면 Safari로 빠져나가고, 세션이 Safari에만 남는 경우가 있다. 로그인 화면이 그 상황을 감지해 안내를 띄운다. 안 붙으면 Safari에서 먼저 로그인한 뒤 홈 화면 아이콘으로 다시 열면 된다. 휴식 타이머 알림도 iOS에선 진동이 없고 무음 스위치면 소리가 안 나니, 화면에 떠 있는 바와 탭 제목 깜빡임이 기본이다.

식약처 키: [공공데이터포털](https://www.data.go.kr/data/15127578/openapi.do) → "식품의약품안전처_식품영양성분DB정보" 활용신청(개발계정 자동승인) → 일반 인증키 **Decoding** 값. 응답 필드 매핑(`AMT_NUM1` 에너지 등)은 `lib/mfds.ts` 상단 `FIELD` 한 곳 — 첫 검색에서 사과 단백질이 10g 넘게 나오면 거기 고치면 됨.

### Supabase (SSO + 클라우드) 세팅 체크리스트

코드 쪽은 다 돼 있다. 아래는 Supabase 대시보드에서 한 번만 하면 되는 일. 순서대로.

**1. 프로젝트**
- [supabase.com](https://supabase.com) → New project. Region은 **Northeast Asia (Seoul)** 또는 Tokyo. DB 비밀번호는 따로 적어둘 것 (앱에선 안 씀).

**2. 스키마**
- SQL Editor → New query → `supabase/schema.sql` 전체 붙여넣기 → Run.
- 만들어지는 것: 테이블 6개(`body_metrics`, `meal_logs`, `favorite_meals`, `workout_routines`, `workout_sets`, `daily_summary`) + RLS(본인 row만) + 집계 뷰 2개 + `touch_*` 함수 2개 + 사진 버킷 `meal-photos`.
- 확인: Table Editor에 테이블 6개, Storage에 `meal-photos` 버킷이 보이면 끝. 두 번 실행해도 안전(`if not exists`).
- 사진 버킷은 **비공개**다. 읽기·쓰기·삭제 모두 본인 폴더(`<user-id>/…`)만 허용하고, 앱은 1시간짜리 서명 URL로 보여준다. jpeg 5MB 제한. 기록을 지우거나 사진을 다시 찍으면 예전 파일도 같이 지운다.

**3. 로그인 제공자** (Authentication → Providers)
- **Kakao**: [developers.kakao.com](https://developers.kakao.com) → 앱 만들기 → 앱 키의 **REST API 키** = Client ID, 보안 → **Client Secret** 생성·활성화 = Client Secret. 카카오 로그인 → 활성화 ON, Redirect URI에 Supabase가 보여주는 `https://<ref>.supabase.co/auth/v1/callback` 등록. 동의항목에서 닉네임·프로필 사진(선택)·이메일(선택) 켜기.
- **Google**: GCP → APIs & Services → OAuth 동의 화면(외부, 테스트 사용자에 본인 계정) → 사용자 인증 정보 → OAuth 클라이언트 ID(웹). 승인된 리디렉션 URI에 같은 `https://<ref>.supabase.co/auth/v1/callback`. Client ID/Secret을 Supabase Google 제공자에 입력.
- 둘 중 하나만 켜도 된다. 혼자 쓰면 Kakao 하나로 충분.

**4. 리다이렉트 허용** (Authentication → URL Configuration)
- Site URL: 배포 주소 (`https://kilo-red.vercel.app`). 로컬 테스트 땐 `http://localhost:3000`.
- Redirect URLs에 전부 추가: `http://localhost:3000/auth/callback`, `https://kilo-red.vercel.app/auth/callback`, Vercel 프리뷰도 쓰면 `https://*-toBeeDev.vercel.app/auth/callback`.

**5. 환경변수**
- Project Settings → API 에서 **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`, **anon public** 키 → `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- 로컬은 `.env.local`, 배포는 Vercel → Settings → Environment Variables. 넣고 재배포(또는 로컬 재시작).
- `service_role` 키는 앱에서 안 쓴다. 어디에도 넣지 말 것.

**6. 확인**
- `/login` 에서 Kakao/Google 로그인 → 홈으로 돌아오고 마이 탭에 "클라우드 저장"이 보이면 성공.
- 게스트로 쓰던 기록이 있으면 마이 탭에 "이 기기에 남은 기록" 카드가 뜬다 → "클라우드로 옮기기" 한 번 (인바디·식사·세트·즐겨찾기·루틴 전부). 중간에 끊겨도 다시 누르면 같은 id로 덮어써서 중복이 안 생긴다.
- 사진 기록 한 번 올려서 Storage → `meal-photos/<user-id>/` 에 파일이 생기는지 본다.

로그인 전에는 `/login`으로 보내고, "로그인 없이 쓰기" 누르면 게스트 쿠키로 통과. 로그인하면 `CloudRepo`, 아니면 `LocalRepo` — UI는 `lib/repo.ts` 인터페이스만 본다.

## 배포 (Vercel)

GitHub 연동으로 올린다. CLI 없이 대시보드에서 끝난다.

**1. 프로젝트 만들기**
- [vercel.com/new](https://vercel.com/new) → Import Git Repository → `toBeeDev/kilo`. Framework는 Next.js로 자동 감지. Root Directory는 비워 둔다.
- `vercel.json` 이 함수 리전을 서울(`icn1`)로 고정한다. Supabase를 서울에 두면 왕복이 짧다.

**2. 환경변수** (Settings → Environment Variables, Production + Preview 둘 다 체크)

| 키 | 값 | 비고 |
|---|---|---|
| `GOOGLE_API_KEY` | AI Studio 키 | 선불 잔액이 있어야 호출된다 |
| `AI_LIMIT_SECRET` | 긴 랜덤 문자열 | `openssl rand -base64 32`. 키를 바꿔도 사용량 쿠키가 안 깨진다 |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 프로젝트 값 | 없으면 로컬 저장 모드로 뜬다 (먼저 배포하고 나중에 넣어도 됨) |
| `MFDS_API_KEY` | 식약처 디코딩 키 | 선택 |
| `NEXT_PUBLIC_SITE_URL` | `https://<도메인>` | 비우면 Vercel 프로덕션 도메인으로 추정. 커스텀 도메인 쓰면 넣는다 |

`AI_MODEL`, `AI_DAILY_*`, `AI_ALLOW_GUEST` 는 기본값으로 두고, 필요할 때만 추가.

**3. Deploy** 누르면 끝. 이후엔 `main` 에 push 할 때마다 자동 배포, PR 은 프리뷰 URL.

**4. Supabase 쪽에 배포 주소 등록** (Supabase 쓸 때만)
- Authentication → URL Configuration → Site URL 을 배포 주소로, Redirect URLs 에 `https://<도메인>/auth/callback` 추가. 프리뷰도 쓰면 `https://*-toBeeDev.vercel.app/auth/callback`.

**5. 배포 후 확인**
- `https://<도메인>/` 이 열리고 `/api/summary` 에 그냥 POST 하면 401 (가드 동작).
- `/icons/512`, `/apple-icon` 이 PNG 로 뜬다. 아이폰 Safari → 공유 → 홈 화면에 추가 → 아이콘·standalone 확인.
- Vercel → Logs 에서 `ai_usage` 검색 → 모델 호출마다 토큰·비용 한 줄.
- 두 번째 배포부터는 서비스 워커가 `?v=<커밋>` 로 바뀌며 이전 캐시를 지운다.

GitHub Actions(`.github/workflows/ci.yml`)가 push 마다 lint·타입체크·테스트·빌드를 돌린다. Vercel 빌드와 별개라, CI 가 빨간데 배포가 나가는 일은 없게 Vercel → Settings → Git → "Ignored Build Step" 은 건드리지 않아도 되고, 대신 GitHub 브랜치 보호에서 `ci / check` 를 필수로 걸면 된다.

## 구조

```
app/
  (app)/            # 탭 UI (RepoProvider + TabBar)
    page.tsx        # 홈
    meals/          # 식단
    workout/        # 운동
    me/             # 마이 (인바디)
  login/            # SSO
  auth/callback     # OAuth 코드 교환
  auth/signout
  api/inbody/parse  # 결과지 사진 → {weight, bodyFatPct, skeletalMuscle, measuredOn}
  api/meal/parse    # 사진/텍스트 → items[]
components/
  ui.tsx            # Button, Card, Field, Segmented, Stepper, Sheet, DayNav
  Calendar.tsx      # 홈 달력 (주/월, 상태 점)
  Nutrition.tsx     # CalorieRing, MacroBars, MacroRatioBar
  Meal.tsx          # MealPhoto, MealSheet(찍기→분석→확인→저장, 즐겨찾기), FavoriteCard
  Body.tsx          # 바디맵 SVG (근육 영역 × 세트 수)
  WorkoutCharts.tsx # 부위별 세트 / 주간 볼륨 / 종목별 1RM 추세
  Workout.tsx       # ExerciseDemo, ExercisePicker, SetLogger
  Inbody.tsx        # TargetSummary, InbodySheet
demo/, scripts/build-demo.mjs  # 단일 HTML 데모 번들 (node scripts/build-demo.mjs)
lib/
  macros.ts         # 계산 공식 (테스트 16개)
  ai.ts             # 서버 전용. 모델은 읽기/파싱만.
  repo.ts           # LocalRepo / CloudRepo
  repo-provider.tsx
  exercises.ts/json # 종목 52개 큐레이션(한글) + 876개 검색 폴백
  image.ts          # 업로드 전 리사이즈
  supabase/         # client / server / middleware
supabase/schema.sql
```

## 계산 (lib/macros.ts)

| 항목 | 공식 |
|---|---|
| 제지방량 | 체중 × (1 − 체지방률) |
| BMR | 370 + 21.6 × 제지방량 (Katch-McArdle) |
| TDEE | BMR × 1.375 / 1.55 / 1.725 |
| 목표 | 린매스업 +250 / 벌크업 +500 / 다이어트 −500 + 누적 보정 |
| 단백질 | 제지방량 × 2.3 / 2.2 / 2.5 |
| 지방 | 체중 × 0.9 / 1.0 / 0.8 |
| 탄수 | 나머지 |

**보정 루프** (`suggestAdjustment`): 14일 이상 간격 두 인바디 비교.
린매스업 — 체지방 +1%p↑ → −100 / 골격근·체중 정체 → +100. 벌크 — 체지방 +1.5%p↑ → −150 / 체중 +0.5 미만 → +150. 컷 — 골격근 −0.5↓ → +100 / 체중 정체 → −100.

## 운동 미디어

`free-exercise-db`(퍼블릭 도메인) 실제 기구 사진 시작/끝 2장을 CSS로 크로스페이드. 플랜핏 같은 3D 영상으로 바꾸려면 `lib/exercises.ts`의 `media()`만 갈아끼우면 됨 (예: wger CC-BY-SA 영상, 직접 찍은 mp4). 종목 추가는 `lib/exercises.json`의 `curated` 배열에 `{id, ko, en, group, equipment}` 한 줄.

## 더 들어간 것 (v4)

- **휴식 타이머** — 세트 기록하면 자동 시작(기본 90초, 60/90/120/180 선택 저장). 끝나면 진동+비프. 시트 닫아도 하단에 떠 있음.
- **물·나트륨** — 물 타일 탭하면 −/+250/+500/+1L/직접 입력. 목표 = 체중×33mL. 나트륨은 탄수/지방 아래 막대, 2,300 넘으면 노랑·3,500 넘으면 빨강.
- **하루 총평** — 홈 "오늘" 바로 아래 검정 카드. 식사 있으면 "받기" 링크 → 목표·실제·식사·운동·물을 Haiku에 보내서 3문장 + 내일 할 것 하나. `daily_summary`에 캐시, "다시 생성" 가능.
- **과거 날짜 기록** — 홈에서 과거 날짜 고르면 [식사 추가][운동 추가]. 운동은 `sessionStorage`로 날짜 넘겨서 운동 탭이 그 날짜로 열림.
- **데모 번들** — `node scripts/build-demo.mjs --photo rice.jpg` → `demo-dist/index.html` 한 파일(해시 라우터, API는 503 스텁, 시드 데이터). 아티팩트/정적 호스팅용.
- **로컬 → 클라우드 이관** — 게스트로 쓰다 로그인하면 마이 탭에 배너. 사진은 Storage로 올리고 로컬은 비움.
- **식약처 DB** — 음식 행마다 "DB" 버튼 → 검색 → 고르면 100g당 값으로 g에 맞춰 자동 계산. 손으로 수치 고치면 DB 기준은 해제.

## 아직 안 한 것

- 식단/인바디/총평 AI는 키 없이 실호출 테스트 못 함. 첫 실사용 때 프롬프트 손볼 것.
- 식약처 응답 필드 매핑 실키로 확인 필요 (위 참고).
- 식사 슬롯(아침/점심/저녁/간식) → 시간 타임라인 전환 검토 중.
- 루틴 템플릿, PWA 오프라인(서비스워커 + 전송 큐), 인바디 추세 그래프, 주간 리포트, PR 배지, 푸시.
