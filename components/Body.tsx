"use client";

import { exercise, type Muscle } from "@/lib/exercises";
import type { WorkoutSet } from "@/lib/types";
import polygons from "@/lib/body-polygons.json";

/**
 * 자극 부위 바디맵.
 * 근육 폴리곤 데이터: react-body-highlighter (MIT, github.com/GV79/react-body-highlighter).
 * 앞/뒤 각각 viewBox 0 0 100 200. 오늘 세트 수에 따라 부위가 진해진다.
 */

export type MuscleScore = Partial<Record<Muscle, number>>;

/** 세트 → 부위 점수. 주동근 1, 보조근 0.4 */
export function muscleScores(sets: WorkoutSet[]): MuscleScore {
  const score: MuscleScore = {};
  for (const s of sets) {
    const ex = exercise(s.exerciseId);
    score[ex.muscle] = (score[ex.muscle] ?? 0) + 1;
    for (const m of ex.secondary) score[m] = (score[m] ?? 0) + 0.4;
  }
  return score;
}

function level(v: number | undefined): number {
  if (!v) return 0;
  if (v >= 6) return 1;
  if (v >= 3) return 0.7;
  return 0.4;
}

/** 폴리곤 데이터의 부위 이름 → 우리 Muscle 키 (여러 개면 최대값) */
const REGION_TO_MUSCLES: Record<string, Muscle[]> = {
  CHEST: ["chest"],
  FRONT_DELTOIDS: ["shoulders"],
  BACK_DELTOIDS: ["shoulders"],
  BICEPS: ["biceps"],
  TRICEPS: ["triceps"],
  FOREARM: ["forearms"],
  ABS: ["abdominals"],
  OBLIQUES: ["abdominals"],
  QUADRICEPS: ["quadriceps"],
  HAMSTRING: ["hamstrings"],
  GLUTEAL: ["glutes"],
  CALVES: ["calves"],
  LEFT_SOLEUS: ["calves"],
  RIGHT_SOLEUS: ["calves"],
  ABDUCTOR: ["adductors"], // 데이터 쪽 이름이 뒤집혀 있음: 뒤쪽 안쪽 허벅지
  ABDUCTORS: ["abductors"], // 앞쪽 바깥 엉덩이
  TRAPEZIUS: ["traps"],
  UPPER_BACK: ["lats", "middle back"],
  LOWER_BACK: ["lower back"],
  NECK: ["neck"],
  HEAD: [],
  KNEES: [],
};

type Side = "front" | "back";
const DATA = polygons as Record<Side, { m: string; p: string[] }[]>;

function Figure({ side, scores, base }: { side: Side; scores: MuscleScore; base: string }) {
  return (
    <svg viewBox="0 0 100 200" className="h-full w-full" aria-hidden>
      {DATA[side].map((region, i) => {
        const muscles = REGION_TO_MUSCLES[region.m] ?? [];
        const l = Math.max(0, ...muscles.map((m) => level(scores[m])));
        return region.p.map((pts, j) => (
          <polygon
            key={`${i}-${j}`}
            points={pts}
            fill={l ? "var(--muscle)" : base}
            fillOpacity={l || 1}
            stroke={l ? "var(--muscle)" : base}
            strokeWidth="0.6"
            strokeLinejoin="round"
          />
        ));
      })}
    </svg>
  );
}

export function BodyMap({
  sets,
  className = "",
  base = "rgba(255,255,255,0.18)",
}: {
  sets: WorkoutSet[];
  className?: string;
  /** 자극 안 된 부위 색. 어두운 카드 위 기본값. */
  base?: string;
}) {
  const scores = muscleScores(sets);
  return (
    <div className={`flex items-stretch justify-center gap-3 ${className}`}>
      <div className="flex min-w-0 flex-1 flex-col items-center">
        <div className="min-h-0 w-full flex-1">
          <Figure side="front" scores={scores} base={base} />
        </div>
        <span className="mt-1 text-[10px]" style={{ color: "rgba(255,255,255,0.45)" }}>
          앞
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col items-center">
        <div className="min-h-0 w-full flex-1">
          <Figure side="back" scores={scores} base={base} />
        </div>
        <span className="mt-1 text-[10px]" style={{ color: "rgba(255,255,255,0.45)" }}>
          뒤
        </span>
      </div>
    </div>
  );
}
