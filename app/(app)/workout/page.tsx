"use client";

import { useCallback, useEffect, useState } from "react";
import { useRepo } from "@/lib/repo-provider";
import { MUSCLE_KO, exercise, type Exercise } from "@/lib/exercises";
import { WORKOUT_DAY_KEY, shiftDay, todayStr, type WorkoutSet } from "@/lib/types";
import { BodyMap, muscleScores } from "@/components/Body";
import WorkoutCharts from "@/components/WorkoutCharts";
import { ExerciseDemo, ExercisePicker, SetLogger } from "@/components/Workout";
import { FloatingRestTimer, RestTimerProvider } from "@/components/RestTimer";
import { RoutineSheet } from "@/components/Routine";
import { DayHeader } from "@/components/DayNav";
import { Button, Card, Empty, Segmented } from "@/components/ui";

type View = "today" | "analysis";

export default function WorkoutPage() {
  return (
    <RestTimerProvider>
      <WorkoutInner />
    </RestTimerProvider>
  );
}

function WorkoutInner() {
  const { repo, ready } = useRepo();
  const today = todayStr();
  const [day, setDay] = useState(today);
  const isToday = day === today;
  const [view, setView] = useState<View>("today");

  // 홈 달력에서 "운동 추가"로 넘어온 과거 날짜
  useEffect(() => {
    try {
      const d = sessionStorage.getItem(WORKOUT_DAY_KEY);
      if (d && /^\d{4}-\d{2}-\d{2}$/.test(d) && d <= today) {
        setDay(d);
        setOrder([]);
      }
      sessionStorage.removeItem(WORKOUT_DAY_KEY);
    } catch {
      /* ignore */
    }
  }, [today]);
  const [sets, setSets] = useState<WorkoutSet[]>([]);
  const [order, setOrder] = useState<string[]>([]); // 오늘 종목 순서 (세트 0개도 유지)
  const [picker, setPicker] = useState(false);
  const [routineOpen, setRoutineOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [history, setHistory] = useState<WorkoutSet[]>([]); // 최근 8주

  const load = useCallback(async () => {
    const [s, h] = await Promise.all([repo.listSets(day), repo.setsInRange(shiftDay(day, -62), day)]);
    setSets(s);
    setOrder((o) => {
      const fromSets = [...new Set(s.map((x) => x.exerciseId))];
      return [...fromSets, ...o.filter((id) => !fromSets.includes(id))];
    });
    setHistory(h);
  }, [repo, day]);

  // 날짜 바뀌면 종목 순서 초기화 (오늘 종목이 과거 날짜에 남지 않게)
  useEffect(() => {
    setOrder([]);
  }, [day]);
  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  const pick = (e: Exercise) => {
    setPicker(false);
    setOrder((o) => (o.includes(e.id) ? o : [...o, e.id]));
    setActive(e.id);
  };

  /** 루틴 불러오기: 이미 있는 종목은 건너뛰고 뒤에 붙인다 */
  const loadRoutine = (ids: string[]) => setOrder((o) => [...o, ...ids.filter((id) => !o.includes(id))]);

  const setsOf = (id: string) => sets.filter((s) => s.exerciseId === id);

  // 세트 변경 = 즉시 저장 (삭제분은 diff로)
  const onSetsChange = async (id: string, next: WorkoutSet[]) => {
    const before = setsOf(id);
    const removed = before.filter((b) => !next.some((n) => n.id === b.id));
    setSets((cur) => [...cur.filter((s) => s.exerciseId !== id), ...next]);
    await Promise.all([repo.saveSets(next), ...removed.map((r) => repo.deleteSet(r.id))]);
    setHistory(await repo.setsInRange(shiftDay(day, -62), day));
  };

  const removeExercise = async (id: string) => {
    await Promise.all(setsOf(id).map((s) => repo.deleteSet(s.id)));
    setSets((cur) => cur.filter((s) => s.exerciseId !== id));
    setOrder((o) => o.filter((x) => x !== id));
  };

  const volume = sets.reduce((v, s) => v + s.weight * s.reps, 0);
  const scores = muscleScores(sets);
  const topMuscles = Object.entries(scores)
    .filter(([, v]) => (v ?? 0) >= 1)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .slice(0, 4)
    .map(([m]) => MUSCLE_KO[m as keyof typeof MUSCLE_KO] ?? m);

  return (
    <>
      <DayHeader
        title="운동"
        day={day}
        onChange={setDay}
        right={
          <div className="w-36">
            <Segmented<View>
              value={view}
              onChange={setView}
              options={[
                { value: "today", label: "오늘" },
                { value: "analysis", label: "분석" },
              ]}
            />
          </div>
        }
      />

      {view === "analysis" ? (
        <div className="mt-4">
          <WorkoutCharts sets={history} />
        </div>
      ) : (
        <>
          {/* 바디맵 + 요약 */}
          <Card className="mt-4" style={{ background: "var(--ink)", color: "#fff" }}>
            <div className="flex gap-4">
              <div className="h-56 w-44 shrink-0">
                <BodyMap sets={sets} className="h-full" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-between py-1">
                <div>
                  <div className="text-[12px]" style={{ color: "rgba(255,255,255,0.55)" }}>
                    {isToday ? "오늘 자극" : "자극 부위"}
                  </div>
                  <div className="mt-0.5 text-[15px] font-semibold leading-snug">
                    {topMuscles.length ? topMuscles.join(" · ") : "아직 없음"}
                  </div>
                </div>
                <div>
                  <div className="text-[12px]" style={{ color: "rgba(255,255,255,0.55)" }}>
                    볼륨
                  </div>
                  <div className="num text-[32px] font-bold leading-none">
                    {Math.round(volume).toLocaleString()}
                    <span className="ml-1 text-xs font-normal" style={{ color: "rgba(255,255,255,0.55)" }}>
                      kg
                    </span>
                  </div>
                  <div className="num mt-1 text-[12px]" style={{ color: "rgba(255,255,255,0.7)" }}>
                    {sets.length}세트 · {order.length}종목
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* 종목 리스트 */}
          <div className="mt-3 space-y-2.5">
            {order.map((id) => {
              const ex = exercise(id);
              const list = setsOf(id);
              return (
                <Card key={id} pad={false} className="overflow-hidden">
                  <button type="button" className="flex w-full items-stretch text-left" onClick={() => setActive(id)}>
                    <ExerciseDemo id={id} className="w-28 shrink-0" rounded="0" />
                    <div className="min-w-0 flex-1 px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="truncate text-[15px] font-semibold">{ex.ko}</div>
                        <span className="shrink-0 text-[12px]" style={{ color: "var(--muted)" }}>
                          {MUSCLE_KO[ex.muscle]}
                        </span>
                      </div>
                      {list.length ? (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {list.map((s) => (
                            <span key={s.id} className="num rounded-md px-1.5 py-0.5 text-[12px] font-medium" style={{ background: "var(--card-2)" }}>
                              {s.weight}×{s.reps}
                              {s.side ? (s.side === "left" ? "L" : "R") : ""}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-1.5 text-[13px]" style={{ color: "var(--muted)" }}>
                          탭해서 세트 기록
                        </div>
                      )}
                    </div>
                  </button>
                  <div className="hairline flex justify-between px-4 py-2 text-[12px]">
                    <span className="num" style={{ color: "var(--muted)" }}>
                      {list.length ? `볼륨 ${Math.round(list.reduce((v, s) => v + s.weight * s.reps, 0)).toLocaleString()}kg` : ""}
                    </span>
                    <button type="button" onClick={() => removeExercise(id)} style={{ color: "var(--muted)" }}>
                      종목 삭제
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>

          {!order.length && <Empty title={isToday ? "오늘 운동 아직 없음" : "이 날 운동 기록 없음"} body="종목을 고르면 지난번 무게가 자동으로 채워져." />}

          <div className="mt-4 flex gap-2">
            <Button className="w-28 shrink-0" size="lg" variant="secondary" onClick={() => setRoutineOpen(true)}>
              루틴
            </Button>
            <Button className="flex-1" size="lg" onClick={() => setPicker(true)}>
              종목 추가
            </Button>
          </div>
        </>
      )}

      {active === null && <FloatingRestTimer />}
      <ExercisePicker open={picker} onClose={() => setPicker(false)} onPick={pick} />
      <RoutineSheet open={routineOpen} onClose={() => setRoutineOpen(false)} currentIds={order} onLoad={loadRoutine} />
      <SetLogger
        open={active !== null}
        onClose={() => setActive(null)}
        day={day}
        exerciseId={active}
        sets={active ? setsOf(active) : []}
        onChange={(next) => active && onSetsChange(active, next)}
      />
    </>
  );
}
