-- kilo 스키마 v1
-- Supabase SQL Editor에 그대로 붙여넣기.
-- 개인용이라 RLS는 "본인 row만" 한 가지 정책으로 통일.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------
-- 1. body_metrics — 인바디 측정 기록 (2주마다 1행)
-- ---------------------------------------------------------------
create table if not exists body_metrics (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  measured_on      date not null,
  weight_kg        numeric(5,1) not null,
  body_fat_pct     numeric(4,1) not null,
  skeletal_muscle_kg numeric(5,1),
  goal             text not null check (goal in ('lean_bulk','bulk','cut')),
  activity         text not null default 'moderate'
                   check (activity in ('light','moderate','high')),
  -- 인바디 피드백 루프 누적 보정값. calcTarget()의 adjustment 인자.
  adjustment_kcal  integer not null default 0,
  created_at       timestamptz not null default now(),
  unique (user_id, measured_on)
);

-- ---------------------------------------------------------------
-- 3. meal_logs — 식사 1건. items는 LLM 파싱 결과 + 유저 확인값.
-- ---------------------------------------------------------------
create table if not exists meal_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  eaten_on    date not null,
  slot        text not null check (slot in ('breakfast','lunch','dinner','snack')),
  raw_input   text,          -- 유저가 친 원문 or 사진 설명
  photo_path  text,          -- storage 경로 (선택)
  -- [{food_id?, name, grams, kcal, protein_g, fat_g, carbs_g, sodium_mg}]
  items       jsonb not null default '[]'::jsonb,
  kcal        numeric(6,1) not null default 0,
  protein_g   numeric(5,1) not null default 0,
  fat_g       numeric(5,1) not null default 0,
  carbs_g     numeric(5,1) not null default 0,
  sodium_mg   numeric(7,1),
  created_at  timestamptz not null default now()
);
create index if not exists meal_logs_user_date_idx on meal_logs (user_id, eaten_on);

-- ---------------------------------------------------------------
-- 3b. favorite_meals — 자주 먹는 식단. 사진 안 찍고 바로 기록.
-- ---------------------------------------------------------------
create table if not exists favorite_meals (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  photo_path   text,
  items        jsonb not null default '[]'::jsonb,
  kcal         numeric(6,1) not null default 0,
  protein_g    numeric(5,1) not null default 0,
  fat_g        numeric(5,1) not null default 0,
  carbs_g      numeric(5,1) not null default 0,
  sodium_mg    numeric(7,1),
  use_count    integer not null default 0,
  last_used_at timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists favorite_meals_user_idx on favorite_meals (user_id, use_count desc);

create or replace function touch_favorite_meal(fav_id uuid)
returns void language sql security invoker as $$
  update favorite_meals
     set use_count = use_count + 1, last_used_at = now()
   where id = fav_id and user_id = auth.uid();
$$;

-- ---------------------------------------------------------------
-- 3c. workout_routines — 루틴 템플릿. 종목 묶음을 이름으로 저장.
-- ---------------------------------------------------------------
create table if not exists workout_routines (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  exercise_keys jsonb not null default '[]'::jsonb, -- free-exercise-db id 배열
  use_count     integer not null default 0,
  last_used_at  timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists workout_routines_user_idx on workout_routines (user_id, use_count desc);

create or replace function touch_workout_routine(routine_id uuid)
returns void language sql security invoker as $$
  update workout_routines
     set use_count = use_count + 1, last_used_at = now()
   where id = routine_id and user_id = auth.uid();
$$;

-- ---------------------------------------------------------------
-- 4. (종목 마스터 없음) 종목은 앱의 lib/exercises.json 이 관리.
--    workout_sets.exercise_key 에 free-exercise-db id 문자열을 저장.
-- ---------------------------------------------------------------

-- ---------------------------------------------------------------
-- 5. workout_sets — 세트 1행. 볼륨/1RM/PR은 여기서 집계.
-- ---------------------------------------------------------------
create table if not exists workout_sets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  done_on     date not null,
  exercise_key text not null,           -- lib/exercises.json 의 id
  set_no      smallint not null,
  weight_kg   numeric(5,1) not null,
  reps        smallint not null,
  rpe         numeric(3,1),
  side        text check (side in ('left','right')),  -- 재활용 편측 기록
  note        text,
  created_at  timestamptz not null default now()
);
create index if not exists workout_sets_user_date_idx on workout_sets (user_id, done_on);
create index if not exists workout_sets_user_ex_idx on workout_sets (user_id, exercise_key, done_on);

-- ---------------------------------------------------------------
-- 6. daily_summary — 하루 1행. 물(water_ml)·LLM 총평 캐시.
--    (user_id, day) upsert로 씀. 섭취·운동 합계는 뷰(v_daily_*)로 계산하므로 여기 두지 않는다.
-- ---------------------------------------------------------------
create table if not exists daily_summary (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  day            date not null,
  water_ml       integer,
  ai_summary     text,       -- 3줄 총평
  ai_next_step   text,       -- 내일 조정 1개
  ai_model       text,
  generated_at   timestamptz,
  unique (user_id, day)
);

-- ---------------------------------------------------------------
-- 7. 회원 탈퇴 — 로그인한 본인만 자기 auth.users 행을 지운다.
--    모든 테이블이 user_id → auth.users on delete cascade 라 기록이 함께 사라진다.
--    Storage 파일은 앱이 먼저 지운다 (CloudRepo.deleteAccount).
-- ---------------------------------------------------------------
create or replace function delete_own_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;
revoke execute on function delete_own_account() from public, anon;
grant execute on function delete_own_account() to authenticated;

-- ---------------------------------------------------------------
-- RLS: 전 테이블 본인 row만
-- ---------------------------------------------------------------
alter table body_metrics  enable row level security;
alter table meal_logs     enable row level security;
alter table favorite_meals enable row level security;
alter table workout_routines enable row level security;
alter table workout_sets  enable row level security;
alter table daily_summary enable row level security;

drop policy if exists "own rows" on body_metrics;
create policy "own rows" on body_metrics  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own rows" on meal_logs;
create policy "own rows" on meal_logs     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own rows" on favorite_meals;
create policy "own rows" on favorite_meals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own rows" on workout_routines;
create policy "own rows" on workout_routines for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own rows" on workout_sets;
create policy "own rows" on workout_sets  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own rows" on daily_summary;
create policy "own rows" on daily_summary for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- 하루 집계 뷰 (daily_summary 채울 때 사용)
-- ---------------------------------------------------------------
create or replace view v_daily_intake with (security_invoker = true) as
select
  user_id,
  eaten_on as day,
  sum(kcal)      as kcal,
  sum(protein_g) as protein_g,
  sum(fat_g)     as fat_g,
  sum(carbs_g)   as carbs_g,
  sum(sodium_mg) as sodium_mg,
  count(*)       as meals
from meal_logs
group by user_id, eaten_on;

create or replace view v_daily_workout with (security_invoker = true) as
select
  user_id,
  done_on as day,
  sum(weight_kg * reps) as volume_kg,
  count(*)              as sets,
  count(distinct exercise_key) as exercises
from workout_sets
group by user_id, done_on;

-- ---------------------------------------------------------------
-- Storage: 식단 사진. 비공개 버킷. 읽기·쓰기·삭제 전부 본인 폴더(<user_id>/...)만.
-- 앱은 createSignedUrl(1시간)로 표시한다. jpeg 5MB 제한.
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('meal-photos', 'meal-photos', false, 5242880, array['image/jpeg'])
on conflict (id) do update
  set public = false, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg'];

drop policy if exists "photos: read" on storage.objects;
drop policy if exists "photos: read own folder" on storage.objects;
create policy "photos: read own folder" on storage.objects for select
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "photos: update own folder" on storage.objects;
create policy "photos: update own folder" on storage.objects for update
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "photos: write own folder" on storage.objects;
create policy "photos: write own folder" on storage.objects for insert
  with check (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "photos: delete own folder" on storage.objects;
create policy "photos: delete own folder" on storage.objects for delete
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);
