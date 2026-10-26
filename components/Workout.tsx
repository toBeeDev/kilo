"use client";

import { useEffect, useMemo, useState } from "react";
import { useRepo } from "@/lib/repo-provider";
import { GROUPS, exercise, media, oneRm, search, type Exercise } from "@/lib/exercises";
import { uid, type WorkoutSet } from "@/lib/types";
import { Button, Segmented, Sheet, Stepper } from "./ui";
import { REST_OPTIONS, RestTimerBar, useRestTimer } from "./RestTimer";

/* ------------------------------------------------------------------ */
/* 동작 데모 — 시작/끝 프레임 크로스페이드                               */
/* ------------------------------------------------------------------ */

export function ExerciseDemo({
  id,
  className = "",
  rounded = "var(--r-md)",
}: {
  id: string;
  className?: string;
  rounded?: string;
}) {
  const [a, b] = media(id);
  const [broken, setBroken] = useState(false);
  if (broken) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ background: "var(--ink)", borderRadius: rounded }}>
        <span className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
          이미지 없음
        </span>
      </div>
    );
  }
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: "var(--ink)", borderRadius: rounded }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={a} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" onError={() => setBroken(true)} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={b} alt="" className="demo-frame-b absolute inset-0 h-full w-full object-cover" loading="lazy" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 종목 선택                                                           */
/* ------------------------------------------------------------------ */

export function ExercisePicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (e: Exercise) => void;
}) {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<string | undefined>();
  const results = useMemo(() => search(q, group), [q, group]);

  useEffect(() => {
    if (open) {
      setQ("");
      setGroup(undefined);
    }
  }, [open]);

  return (
    <Sheet open={open} onClose={onClose} title="종목 추가" tall>
      <input
        autoFocus
        className="w-full rounded-[var(--r-md)] px-4 py-3 outline-none"
        style={{ background: "var(--card)", border: "1px solid var(--line)" }}
        placeholder="머신 플라이, leg press…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
        <GroupChip active={!group} onClick={() => setGroup(undefined)}>
          전체
        </GroupChip>
        {GROUPS.map((g) => (
          <GroupChip key={g} active={group === g} onClick={() => setGroup(g)}>
            {g}
          </GroupChip>
        ))}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-3">
        {results.map((e) => (
          <li key={e.id}>
            <button type="button" className="card w-full overflow-hidden text-left active:scale-[0.98]" onClick={() => onPick(e)}>
              <ExerciseDemo id={e.id} className="aspect-[4/3]" rounded="0" />
              <div className="p-3">
                <div className="truncate text-[14px] font-semibold">{e.ko}</div>
                <div className="text-[12px]" style={{ color: "var(--muted)" }}>
                  {e.group} · {e.equipment}
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>
      {!results.length && (
        <p className="py-10 text-center text-sm" style={{ color: "var(--muted)" }}>
          못 찾았어. 영문으로도 검색해봐.
        </p>
      )}
    </Sheet>
  );
}

function GroupChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium"
      style={{
        background: active ? "var(--ink)" : "var(--card)",
        color: active ? "#fff" : "var(--muted)",
        border: "1px solid var(--line)",
      }}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* 세트 입력                                                           */
/* ------------------------------------------------------------------ */

export function SetLogger({
  open,
  onClose,
  day,
  exerciseId,
  sets,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  day: string;
  exerciseId: string | null;
  sets: WorkoutSet[]; // 오늘 이 종목 세트
  onChange: (sets: WorkoutSet[]) => void;
}) {
  const { repo } = useRepo();
  const timer = useRestTimer();
  const ex = exerciseId ? exercise(exerciseId) : null;
  const [weight, setWeight] = useState(20);
  const [reps, setReps] = useState(12);
  const [side, setSide] = useState<"both" | "left" | "right">("both");
  const [last, setLast] = useState<WorkoutSet[]>([]);
  const [unilateral, setUnilateral] = useState(false);

  // 열릴 때: 오늘 세트 있으면 마지막 세트, 없으면 이전 세션 첫 세트로 프리필
  useEffect(() => {
    if (!open || !exerciseId) return;
    let alive = true;
    (async () => {
      const prev = await repo.lastSets(exerciseId, day);
      if (!alive) return;
      setLast(prev);
      const seed = sets.at(-1) ?? prev[0];
      if (seed) {
        setWeight(seed.weight);
        setReps(seed.reps);
      }
      const uni = sets.some((s) => s.side) || prev.some((s) => s.side);
      setUnilateral(uni);
      setSide(uni ? "right" : "both");
    })();
    return () => {
      alive = false;
    };
  }, [open, exerciseId, day, repo, sets]);

  if (!ex || !exerciseId) return null;

  const addSet = () => {
    const s: WorkoutSet = {
      id: uid(),
      doneOn: day,
      exerciseId,
      setNo: sets.length + 1,
      weight,
      reps,
      side: side === "both" ? undefined : side,
    };
    onChange([...sets, s]);
    timer.start();
  };

  const remove = (id: string) => {
    const next = sets.filter((s) => s.id !== id).map((s, i) => ({ ...s, setNo: i + 1 }));
    onChange(next);
  };

  const best = sets.reduce((m, s) => Math.max(m, oneRm(s.weight, s.reps)), 0);
  const volume = sets.reduce((v, s) => v + s.weight * s.reps, 0);

  return (
    <Sheet open={open} onClose={onClose} tall>
      <div className="-mx-5 -mt-3">
        <ExerciseDemo id={exerciseId} className="aspect-[16/10]" rounded="0" />
      </div>
      {timer.endsAt && (
        <div className="sticky top-12 z-10 -mx-1 mt-3">
          <RestTimerBar />
        </div>
      )}
      <div className="mt-4 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold">{ex.ko}</h2>
          <div className="text-[13px]" style={{ color: "var(--muted)" }}>
            {ex.group} · {ex.equipment}
            {ex.curated && ex.en !== ex.ko ? ` · ${ex.en}` : ""}
          </div>
        </div>
        <button type="button" onClick={onClose} className="pt-1 text-sm" style={{ color: "var(--muted)" }}>
          완료
        </button>
      </div>

      {last.length > 0 && (
        <p className="mt-3 text-[13px]" style={{ color: "var(--muted)" }}>
          지난번 ({fmtDay(last[0].doneOn)}): {last.map((s) => `${s.weight}×${s.reps}`).join(" · ")}
        </p>
      )}

      {/* 오늘 세트 */}
      <div className="card mt-4 overflow-hidden">
        {sets.length === 0 && (
          <p className="px-4 py-4 text-sm" style={{ color: "var(--muted)" }}>
            아직 세트 없음
          </p>
        )}
        {sets.map((s) => (
          <div key={s.id} className="hairline flex items-center gap-3 px-4 py-2.5 first:border-t-0">
            <span className="w-6 text-[13px]" style={{ color: "var(--muted)" }}>
              {s.setNo}
            </span>
            <span className="num flex-1 text-[15px] font-semibold">
              {s.weight}
              <span className="text-xs font-normal" style={{ color: "var(--muted)" }}>
                kg
              </span>
              <span className="mx-2" style={{ color: "var(--line)" }}>
                ×
              </span>
              {s.reps}
              <span className="text-xs font-normal" style={{ color: "var(--muted)" }}>
                회
              </span>
            </span>
            {s.side && (
              <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                {s.side === "left" ? "왼" : "오른"}
              </span>
            )}
            <button type="button" onClick={() => remove(s.id)} className="text-xs" style={{ color: "var(--muted)" }} aria-label="세트 삭제">
              ✕
            </button>
          </div>
        ))}
        {sets.length > 0 && (
          <div className="hairline flex justify-between px-4 py-2.5 text-[13px]" style={{ color: "var(--muted)" }}>
            <span>볼륨 {Math.round(volume).toLocaleString()}kg</span>
            <span>예상 1RM {Math.round(best)}kg</span>
          </div>
        )}
      </div>

      {/* 입력 */}
      <div className="card mt-3 p-5">
        <div className="flex justify-around">
          <Stepper label="무게" value={weight} step={2.5} unit="kg" onChange={setWeight} />
          <Stepper label="횟수" value={reps} step={1} min={1} unit="회" onChange={setReps} />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            className="text-[13px] underline"
            style={{ color: "var(--muted)" }}
            onClick={() => {
              const next = !unilateral;
              setUnilateral(next);
              setSide(next ? "right" : "both");
            }}
          >
            {unilateral ? "양쪽으로 기록" : "한쪽씩 기록 (재활)"}
          </button>
          {unilateral && (
            <div className="w-40">
              <Segmented<"left" | "right">
                value={side === "both" ? "right" : side}
                onChange={setSide}
                options={[
                  { value: "right", label: "오른쪽" },
                  { value: "left", label: "왼쪽" },
                ]}
              />
            </div>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between text-[12px]" style={{ color: "var(--muted)" }}>
          <span>휴식</span>
          <div className="flex gap-1">
            {REST_OPTIONS.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => timer.setPreferred(o)}
                className="num rounded-full px-2.5 py-1 font-semibold"
                style={{
                  background: timer.preferred === o ? "var(--ink)" : "var(--card-2)",
                  color: timer.preferred === o ? "#fff" : "var(--muted)",
                }}
              >
                {o}s
              </button>
            ))}
          </div>
        </div>
        <Button className="mt-3 w-full" size="lg" onClick={addSet}>
          {sets.length + 1}세트 기록
        </Button>
      </div>

      {ex.steps && ex.steps.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-[13px] font-semibold" style={{ color: "var(--muted)" }}>
            동작 설명
          </summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-[13px]" style={{ color: "var(--muted)" }}>
            {ex.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </details>
      )}
    </Sheet>
  );
}

export function fmtDay(day: string) {
  const d = new Date(day + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
