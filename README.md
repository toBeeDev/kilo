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
```

**키 없이도 돌아감.** Supabase 없으면 "이 기기에만 저장"(localStorage) 모드, AI 키 없으면 식단·인바디는 수동 입력.
폰에서: 같은 와이파이에서 `http://<맥IP>:3000` → 홈 화면에 추가.

## 설정 (선택)

`.env.example` → `.env.local`

| 키 | 역할 | 없으면 |
|---|---|---|
| `ANTHROPIC_API_KEY` | 식단 사진 파싱, 인바디 결과지 읽기 | 수동 입력 |
| `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` | SSO 로그인 + 클라우드 저장 | 로컬 저장 |
| `MFDS_API_KEY` | 식약처 식품영양성분DB 검색 (음식 행의 "DB" 버튼) | AI 추정값만 |
| `AI_MODEL` | 기본 `claude-haiku-5-5` | — |

식약처 키: [공공데이터포털](https://www.data.go.kr/data/15127578/openapi.do) → "식품의약품안전처_식품영양성분DB정보" 활용신청(개발계정 자동승인) → 일반 인증키 **Decoding** 값. 응답 필드 매핑(`AMT_NUM1` 에너지 등)은 `lib/mfds.ts` 상단 `FIELD` 한 곳 — 첫 검색에서 사과 단백질이 10g 넘게 나오면 거기 고치면 됨.

### Supabase (SSO + 클라우드)

1. 프로젝트 생성 → SQL Editor에 `supabase/schema.sql   # 7개 테이블(favorite_meals 포함) + RLS + 뷰 + 사진 버킷` 붙여넣기 (테이블 6개 + RLS + 뷰 + 사진 버킷)
2. Authentication → Providers → **Google**, **Kakao** 켜기
   - Kakao: [developers.kakao.com](https://developers.kakao.com) 앱 → REST API 키 + Client Secret → Supabase에 입력, Redirect URI는 Supabase가 보여주는 `https://<ref>.supabase.co/auth/v1/callback`
   - Google: GCP OAuth 클라이언트 → 같은 Redirect URI
3. Authentication → URL Configuration → Site URL `http://localhost:3000`, Redirect URLs에 `http://localhost:3000/auth/callback` (배포하면 도메인도)
4. `.env.local` 채우고 재시작 → `/login`

로그인 전에는 `/login`으로 보내고, "로그인 없이 쓰기" 누르면 게스트 쿠키로 통과. 로그인하면 `CloudRepo`, 아니면 `LocalRepo` — UI는 `lib/repo.ts` 인터페이스만 본다. 로컬 데이터는 클라우드로 자동 이관되지 않음 (필요하면 나중에).

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
