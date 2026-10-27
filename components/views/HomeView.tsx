"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useRepo } from "@/lib/repo-provider";
import { GOAL_LABEL, calcTarget, waterTarget } from "@/lib/macros";
import { MUSCLE_KO, exercise } from "@/lib/exercises";
import { muscleScores } from "@/components/Body";
import { SummaryCard } from "@/components/Daily";
import { BarsMini, DropIcon, DumbbellIcon, EggIcon, FlameIcon, MacroStrip, RingMini, SparkMini, Tile, WaterChips } from "@/components/Tiles";
import {
  SLOTS,
  SLOT_LABEL,
  shiftDay,
  todayStr,
  WORKOUT_DAY_KEY,
  type BodyRecord,
  type DaySummary,
  type DayTotal,
  type MealLog,
  type MealSlot,
  type WorkoutSet,
} from "@/lib/types";
import Calendar, { monthRange, ymOf } from "@/components/Calendar";
import { AppHeader, CameraIcon, IconButton, timeGreeting } from "@/components/PageHeader";
import { MealPhoto, MealSheet } from "@/components/Meal";
import { Button, Card } from "@/components/ui";

export default function HomeView() {
  const { repo, ready, user } = useRepo();
  const router = useRouter();
  const name = (user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "게스트") as string;
  const today = todayStr();
  const [day, setDay] = useState(today);
  const [month, setMonth] = useState(ymOf(today));
  const [latest, setLatest] = useState<BodyRecord | null>(null);
  const [totals, setTotals] = useState<Map<string, DayTotal>>(new Map());
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [sets, setSets] = useState<WorkoutSet[]>([]);
  const [water, setWater] = useState(0);
  const [waterOpen, setWaterOpen] = useState(false);
  const [summary, setSummary] = useState<DaySummary | null>(null);
  const [sheet, setSheet] = useState<{ slot?: MealSlot; existing?: MealLog } | null>(null);

  const loadMonth = useCallback(async () => {
    const { first, last } = monthRange(month);
    const rows = await repo.dailyTotals(shiftDay(first, -14), last);
    setTotals(new Map(rows.map((r) => [r.day, r])));
  }, [repo, month]);

  const loadDay = useCallback(async () => {
    const [b, m, s, w, sm] = await Promise.all([
      repo.listBody(),
      repo.listMeals(day),
      repo.listSets(day),
      repo.getWater(day),
      repo.getSummary(day),
    ]);
    setLatest(b[0] ?? null);
    setMeals(m);
    setSets(s);
    setWater(w);
    setSummary(sm);
  }, [repo, day]);

  useEffect(() => {
    if (ready) loadMonth();
  }, [ready, loadMonth]);
  useEffect(() => {
    if (ready) loadDay();
  }, [ready, loadDay]);

  const reload = () => {
    loadDay();
    loadMonth();
  };

  const target = latest ? calcTarget(latest, latest.goal, latest.activity, latest.adjustmentKcal) : null;
  const eaten = meals.reduce(
    (a, m) => ({ kcal: a.kcal + m.kcal, carbs: a.carbs + m.carbs, protein: a.protein + m.protein, fat: a.fat + m.fat }),
    { kcal: 0, carbs: 0, protein: 0, fat: 0 },
  );
  const sodium = meals.reduce((a, m) => a + (m.sodium ?? 0), 0);
  const wTarget = waterTarget(latest?.weight);
  // 타일 시각화용: 선택일 포함 최근 7일 단백질, 최근 운동일 볼륨 8개
  const protein7 = Array.from({ length: 7 }, (_, i) => {
    const d = shiftDay(day, i - 6);
    if (d === day) return eaten.protein; // 선택일은 실시간 값
    return totals.get(d)?.protein ?? 0;
  });
  const volumeHistory = [...totals.values()]
    .filter((t) => t.day < day && t.volume > 0)
    .sort((a, b) => (a.day < b.day ? -1 : 1))
    .slice(-7)
    .map((t) => t.volume);
  const kcalStatus =
    !target ? null : eaten.kcal > target.kcal ? "over" : target.kcal - eaten.kcal <= target.kcal * 0.15 ? "warn" : "ok";
  // 칼로리 타일은 주황. 초과했을 때만 빨강.
  const kcalColor = kcalStatus === "over" ? "var(--over)" : "var(--kcal)";
  const remaining = target ? Math.round(target.kcal - eaten.kcal) : null;
  const volume = sets.reduce((v, s) => v + s.weight * s.reps, 0);
  const exerciseIds = [...new Set(sets.map((s) => s.exerciseId))];
  const isToday = day === today;

  const openWorkoutFor = (d: string) => {
    try {
      sessionStorage.setItem(WORKOUT_DAY_KEY, d);
    } catch {
      /* ignore */
    }
    router.push("/workout");
  };
  const emptyPast = !isToday && !meals.length && !sets.length;

  const onWater = async (ml: number) => {
    setWater(ml);
    await repo.setWater(day, ml);
  };

  const generateSummary = async () => {
    const scores = muscleScores(sets);
    const muscles = Object.entries(scores)
      .filter(([, v]) => (v ?? 0) >= 1)
      .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
      .slice(0, 4)
      .map(([m]) => MUSCLE_KO[m as keyof typeof MUSCLE_KO] ?? m);
    const lines = exerciseIds.map((id) => {
      const list = sets.filter((s) => s.exerciseId === id);
      return `${exercise(id).ko} ${list.map((s) => `${s.weight}×${s.reps}`).join(", ")}`;
    });
    const payload = {
      day,
      goalLabel: latest ? GOAL_LABEL[latest.goal] : "유지",
      target: target ? { kcal: target.kcal, protein: target.protein, fat: target.fat, carbs: target.carbs } : null,
      actual: {
        kcal: Math.round(eaten.kcal),
        protein: Math.round(eaten.protein),
        fat: Math.round(eaten.fat),
        carbs: Math.round(eaten.carbs),
        sodium: Math.round(sodium),
        waterMl: water,
        waterTarget: wTarget,
      },
      meals: meals.map((m) => `${SLOT_LABEL[m.slot]}: ${m.items.map((i) => i.name).join(", ")} (${Math.round(m.kcal)}kcal, 단 ${Math.round(m.protein)}g)`),
      workout: sets.length ? { volume: Math.round(volume), sets: sets.length, lines, muscles } : null,
      body: latest ? { weight: latest.weight, bodyFatPct: latest.bodyFatPct, skeletalMuscle: latest.skeletalMuscle } : null,
    };
    const res = await fetch("/api/summary", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "총평 실패");
    const saved: DaySummary = { day, summary: json.summary, nextStep: json.nextStep, model: json.model, generatedAt: new Date().toISOString() };
    await repo.saveSummary(saved);
    setSummary(saved);
  };
  const d = new Date(day + "T00:00:00");
  const dayLabel = `${d.getMonth() + 1}월 ${d.getDate()}일 ${"일월화수목금토"[d.getDay()]}`;

  return (
    <>
      <AppHeader
        title={`안녕, ${name} 👋`}
        highlight="var(--hl-home)"
        subtitle={`${timeGreeting()}. 오늘 먹은 것, 든 것 남기자.`}
        actions={
          <IconButton onClick={() => setSheet({})} label="사진으로 기록">
            <CameraIcon />
          </IconButton>
        }
      />

      <div className="mt-4">
        <Calendar month={month} onMonthChange={setMonth} selected={day} onSelect={setDay} totals={totals} target={target?.kcal ?? null} />
      </div>

      <div className="mb-2 mt-5 flex items-baseline justify-between px-1">
        <h2 className="text-[17px] font-bold">{isToday ? "오늘" : dayLabel}</h2>
        {isToday && (
          <span className="text-[12px]" style={{ color: "var(--muted)" }}>
            {dayLabel}
          </span>
        )}
      </div>

      {(isToday || meals.length > 0) && (
        <>
          <div className="mb-3 empty:hidden">
            <SummaryCard day={day} summary={summary} canGenerate={meals.length > 0} onGenerate={generateSummary} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Tile
              color={kcalColor}
              icon={<FlameIcon />}
              label="칼로리"
              value={Math.round(eaten.kcal).toLocaleString()}
              unit={target ? `kcal / ${target.kcal.toLocaleString()}` : "kcal"}
              sub={
                remaining !== null && (
                  <span style={{ color: kcalColor, fontWeight: 600 }}>
                    {remaining >= 0 ? `${remaining.toLocaleString()} 남음` : `${Math.abs(remaining).toLocaleString()} 초과`}
                  </span>
                )
              }
              viz={<RingMini ratio={target ? eaten.kcal / target.kcal : 0} color={kcalColor} />}
            />
            <Tile
              color="var(--water)"
              icon={<DropIcon />}
              label="물"
              value={water.toLocaleString()}
              unit={`mL / ${wTarget.toLocaleString()}`}
              sub={
                <span style={{ color: "var(--muted)" }}>
                  {waterOpen ? "닫기" : "탭해서 추가"}
                </span>
              }
              viz={<RingMini ratio={water / wTarget} color="var(--water)" />}
              onClick={isToday || meals.length > 0 ? () => setWaterOpen((v) => !v) : undefined}
              active={waterOpen}
            />
            <Tile
              color="var(--protein)"
              icon={<EggIcon />}
              label="단백질"
              value={Math.round(eaten.protein).toString()}
              unit={target ? `g / ${target.protein}` : "g"}
              sub={
                target && (
                  <span style={{ color: eaten.protein >= target.protein ? "var(--protein)" : "var(--muted)", fontWeight: 600 }}>
                    {eaten.protein >= target.protein ? "목표 달성" : `${Math.round(target.protein - eaten.protein)}g 더`}
                  </span>
                )
              }
              viz={<BarsMini values={protein7} target={target?.protein ?? null} color="var(--protein)" />}
            />
            <Tile
              color="var(--workout)"
              icon={<DumbbellIcon />}
              label="운동"
              value={sets.length ? Math.round(volume).toLocaleString() : "—"}
              unit={sets.length ? `kg · ${sets.length}세트` : "오늘 기록 없음"}
              sub={
                volumeHistory.length > 0 && (
                  <span style={{ color: "var(--muted)" }}>
                    최근 {volumeHistory.length}회
                  </span>
                )
              }
              viz={<SparkMini values={sets.length ? [...volumeHistory, volume] : volumeHistory} color="var(--workout)" />}
            />
          </div>
          {waterOpen && (
            <div className="mt-3">
              <WaterChips water={water} onWater={onWater} />
            </div>
          )}
          <div className="mt-3">
            <MacroStrip carbs={eaten.carbs} fat={eaten.fat} sodium={sodium} target={target ? { carbs: target.carbs, fat: target.fat } : null} />
          </div>
          {!latest && (
            <Link
              href="/me"
              className="mt-3 block rounded-[var(--r-lg)] px-4 py-3 text-center text-[14px] font-semibold"
              style={{ background: "var(--ink)", color: "#fff" }}
            >
              인바디 넣고 목표 잡기
            </Link>
          )}
        </>
      )}

      {/* 과거 날짜 + 아무 기록 없음 → 카드 하나로 */}
      {emptyPast && (
        <Card className="mt-3">
          <div className="text-[15px] font-semibold">기록 없음</div>
          <p className="mt-1 text-[13px]" style={{ color: "var(--muted)" }}>
            빠뜨린 거 있으면 지금 넣어도 돼. 달력이랑 분석에 그대로 반영.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => setSheet({})}>
              식사 추가
            </Button>
            <Button variant="secondary" onClick={() => openWorkoutFor(day)}>
              운동 추가
            </Button>
          </div>
        </Card>
      )}

      {/* 식사 — 한 줄 요약. 끼니별 구조는 식단 탭에서 */}
      {!emptyPast && (
        <Card className="mt-3" pad={false}>
          <div className="flex items-center justify-between px-5 py-3.5">
            <div className="flex items-baseline gap-2">
              <span className="text-[15px] font-semibold">식사</span>
              {meals.length > 0 && (
                <span className="num text-[13px]" style={{ color: "var(--muted)" }}>
                  {meals.length}끼 · {Math.round(eaten.kcal).toLocaleString()}kcal
                </span>
              )}
            </div>
            {isToday ? (
              <Link href="/meals" className="text-[13px] font-semibold" style={{ color: "var(--ink)" }}>
                {meals.length ? "자세히 ›" : "기록하기 ›"}
              </Link>
            ) : (
              <button type="button" onClick={() => setSheet({})} className="text-[13px] font-semibold" style={{ color: "var(--ink)" }}>
                추가 ›
              </button>
            )}
          </div>
          {meals.length > 0 ? (
            <div className="hairline flex gap-2 overflow-x-auto px-5 py-3">
              {meals.map((m) => (
                <button key={m.id} type="button" onClick={() => setSheet({ existing: m })} className="w-[72px] shrink-0 text-left">
                  {m.photo ? (
                    <MealPhoto src={m.photo} items={[]} className="h-[72px] w-[72px]" rounded="14px" />
                  ) : (
                    <div className="flex h-[72px] w-[72px] items-center justify-center rounded-[14px] px-1.5 text-center text-[10px] leading-tight" style={{ background: "var(--card-2)", color: "var(--muted)" }}>
                      {m.items[0]?.name ?? "기록"}
                    </div>
                  )}
                  <div className="mt-1 truncate text-[11px]">{SLOT_LABEL[m.slot]}</div>
                  <div className="num text-[11px]" style={{ color: "var(--muted)" }}>
                    {Math.round(m.kcal)}
                  </div>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSheet({})}
                className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-[14px] text-xl"
                style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                aria-label="식사 추가"
              >
                +
              </button>
            </div>
          ) : (
            <p className="px-5 pb-4 text-[13px]" style={{ color: "var(--muted)" }}>
              {isToday ? "아직 기록 없음 · 위 카메라로 찍거나 식단 탭에서" : "이 날 식사 기록 없음"}
            </p>
          )}
        </Card>
      )}

      {/* 운동 */}
      {!emptyPast && (
        <Card className="mt-3" pad={false}>
          <div className="flex items-center justify-between px-5 py-3.5">
            <span className="text-[15px] font-semibold">운동</span>
            {isToday ? (
              <Link href="/workout" className="text-[13px] font-semibold" style={{ color: "var(--ink)" }}>
                {sets.length ? "기록 보기 ›" : "시작하기 ›"}
              </Link>
            ) : sets.length > 0 ? (
              <button type="button" onClick={() => openWorkoutFor(day)} className="num text-[13px]" style={{ color: "var(--muted)" }}>
                {Math.round(volume).toLocaleString()}kg · {sets.length}세트 · 수정 ›
              </button>
            ) : (
              <button type="button" onClick={() => openWorkoutFor(day)} className="text-[13px] font-semibold" style={{ color: "var(--ink)" }}>
                추가 ›
              </button>
            )}
          </div>
          {sets.length > 0 ? (
            <>
              {isToday && (
                <div className="flex gap-6 px-5 pb-3">
                  <Stat label="볼륨" value={`${Math.round(volume).toLocaleString()}`} unit="kg" />
                  <Stat label="세트" value={`${sets.length}`} />
                  <Stat label="종목" value={`${exerciseIds.length}`} />
                </div>
              )}
              {exerciseIds.map((id) => {
                const list = sets.filter((s) => s.exerciseId === id);
                return (
                  <div key={id} className="hairline flex items-center gap-3 px-5 py-2.5">
                    <span className="min-w-0 flex-1 truncate text-[14px]">{exercise(id).ko}</span>
                    <span className="flex flex-wrap justify-end gap-1">
                      {list.map((s) => (
                        <span key={s.id} className="num rounded-md px-1.5 py-0.5 text-[11px] font-medium" style={{ background: "var(--card-2)" }}>
                          {s.weight}×{s.reps}
                          {s.side ? (s.side === "left" ? "L" : "R") : ""}
                        </span>
                      ))}
                    </span>
                  </div>
                );
              })}
            </>
          ) : (
            isToday && (
              <p className="px-5 pb-4 text-[13px]" style={{ color: "var(--muted)" }}>
                오늘 기록 없음
              </p>
            )
          )}
        </Card>
      )}

      <MealSheet
        open={sheet !== null}
        onClose={() => setSheet(null)}
        day={day}
        slot={sheet?.slot}
        existing={sheet?.existing}
        onSaved={reload}
      />
    </>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <div className="num text-xl font-bold">
        {value}
        {unit && <span className="ml-0.5 text-xs font-normal">{unit}</span>}
      </div>
      <div className="text-[12px]" style={{ color: "var(--muted)" }}>
        {label}
      </div>
    </div>
  );
}
