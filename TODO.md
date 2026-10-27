# 남은 일 (내가 직접 해야 하는 것)

코드 쪽은 전부 돼 있다. 아래는 대시보드·계정에서만 할 수 있는 일. 위에서부터 순서대로.

## A. Supabase (클라우드 저장 + 로그인) — 약 15분

1. [ ] supabase.com → New project. 이름 `kilo`, Region **Northeast Asia (Seoul)**, DB 비밀번호 생성해서 적어 두기.
2. [ ] SQL Editor → New query → `supabase/schema.sql` 통째로 붙여넣기 → Run. "Success" 뜨면 끝.
3. [ ] Project Settings → API 에서 **Project URL**, **anon public** 키 복사.
4. [ ] 로컬 `.env.local` 에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 채우고 `npm run check:supabase` → 전부 ✓ 인지 확인.
5. [ ] Authentication → Providers → **Email** 이 켜져 있는지 확인. 혼자 쓰면 "Confirm email" 끄기 (확인 메일 생략).
6. [ ] Authentication → URL Configuration
   - Site URL: `https://kilo-red.vercel.app`
   - Redirect URLs: `https://kilo-red.vercel.app/auth/callback`, `http://localhost:3000/auth/callback`
7. [ ] Vercel → Settings → Environment Variables 에 3번의 두 값 추가(Production) → Deployments → Redeploy.
8. [ ] `https://kilo-red.vercel.app/signup` 에서 이메일로 가입 → 마이 탭에 "클라우드 저장" 보이면 성공.
9. [ ] 폰에서 같은 계정으로 로그인 → 기록이 같은지 확인. 게스트로 쓰던 기록이 있으면 마이 탭 "클라우드로 옮기기".

## B. 카카오 / 구글 로그인 — 선택, 각 10분

이메일 로그인만으로도 충분하다. 버튼을 살리고 싶을 때만.

- [ ] **Kakao**: developers.kakao.com → 앱 만들기 → REST API 키(=Client ID), 보안 → Client Secret 생성·활성화 → 카카오 로그인 ON → Redirect URI 에 Supabase 가 보여주는 `https://<ref>.supabase.co/auth/v1/callback` → 동의항목 닉네임·이메일. Supabase → Providers → Kakao 에 ID/Secret 입력.
- [ ] **Google**: GCP → OAuth 동의 화면(외부, 테스트 사용자에 내 계정) → 사용자 인증 정보 → OAuth 클라이언트(웹) → 승인된 리디렉션 URI 에 같은 Supabase 콜백 → Supabase → Providers → Google 에 입력.

## C. AI 키 위생 — 5분

- [ ] 이 대화에 한 번 붙여 넣었던 Google 키는 AI Studio 에서 **새 키로 교체**하고 옛 키 삭제. Vercel 환경변수 `GOOGLE_API_KEY` 갱신 → Redeploy.
- [ ] AI Studio → 결제 → 월 예산 알림 (1만 원) 걸어 두기.

## D. 폰 설치 — 2분

- [ ] 아이폰 Safari 로 `https://kilo-red.vercel.app` → 공유 → 홈 화면에 추가. 아이콘·전체화면 확인.
- [ ] 홈 화면 앱에서는 **이메일 로그인**으로 들어오기 (카카오·구글은 Safari 로 튄다).

## E. 쓰면서 볼 것

- 식단 사진 한 장 올려서 Supabase → Storage → `meal-photos/<내 id>/` 에 파일 생기는지.
- Vercel → Logs 에서 `ai_usage` 검색 → 토큰·비용 줄이 찍히는지.
- 마이 탭 맨 아래 "계정" 카드에서 비밀번호 변경·회원 탈퇴가 보이는지 (탈퇴는 진짜 지워지니 테스트 계정으로).
