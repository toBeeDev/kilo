/**
 * 인바디 지표 → 목표 칼로리/매크로 계산.
 * 전부 순수 함수. LLM 안 씀. 같은 입력이면 항상 같은 답.
 */

export type Goal = "lean_bulk" | "bulk" | "cut";

/** 주간 운동 빈도 기준 활동계수 */
export type Activity = "light" | "moderate" | "high";

export const ACTIVITY_FACTOR: Record<Activity, number> = {
  light: 1.375, // 주 1~2회
  moderate: 1.55, // 주 3~5회 (웨이트 기본값)
  high: 1.725, // 주 6회+ 또는 육체노동
};

export const GOAL_LABEL: Record<Goal, string> = {
  lean_bulk: "린매스업",
  bulk: "벌크업",
  cut: "다이어트",
};

export const ACTIVITY_LABEL: Record<Activity, string> = {
  light: "주 1~2회",
  moderate: "주 3~5회",
  high: "주 6회+",
};

/** 인바디 결과지에서 그대로 옮기는 값 */
export interface BodyMetrics {
  /** 체중 kg */
  weight: number;
  /** 체지방률 % */
  bodyFatPct: number;
  /** 골격근량 kg (선택, 추세 판단용) */
  skeletalMuscle?: number;
  /** 측정일 ISO (YYYY-MM-DD) */
  date?: string;
}

export interface MacroTarget {
  /** 제지방량 kg */
  lbm: number;
  /** 기초대사량 kcal (Katch-McArdle) */
  bmr: number;
  /** 유지 칼로리 kcal */
  tdee: number;
  /** 목표 칼로리 kcal */
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  /** 목표 대비 순증감 kcal (tdee 기준) */
  surplus: number;
}

/** 목표별 칼로리 가감 */
const GOAL_DELTA: Record<Goal, number> = {
  lean_bulk: 250,
  bulk: 500,
  cut: -500,
};

/** 단백질 g per kg 제지방량 */
const PROTEIN_PER_LBM: Record<Goal, number> = {
  lean_bulk: 2.3,
  bulk: 2.2,
  cut: 2.5, // 감량 중 근손실 방어
};

/** 지방 g per kg 체중 */
const FAT_PER_KG: Record<Goal, number> = {
  lean_bulk: 0.9,
  bulk: 1.0,
  cut: 0.8,
};

const round = (n: number, d = 0) => {
  const p = 10 ** d;
  return Math.round(n * p) / p;
};

/** 제지방량 = 체중 × (1 − 체지방률) */
export function leanBodyMass(m: BodyMetrics): number {
  return m.weight * (1 - m.bodyFatPct / 100);
}

/** Katch-McArdle: BMR = 370 + 21.6 × LBM */
export function bmrKatchMcArdle(lbm: number): number {
  return 370 + 21.6 * lbm;
}

export function tdee(bmr: number, activity: Activity): number {
  return bmr * ACTIVITY_FACTOR[activity];
}

/**
 * 메인 계산.
 * @param adjustment 인바디 피드백 루프로 누적된 보정값 kcal (기본 0)
 */
export function calcTarget(
  m: BodyMetrics,
  goal: Goal,
  activity: Activity = "moderate",
  adjustment = 0,
): MacroTarget {
  const lbm = leanBodyMass(m);
  const bmr = bmrKatchMcArdle(lbm);
  const maintenance = tdee(bmr, activity);
  const kcal = maintenance + GOAL_DELTA[goal] + adjustment;

  const protein = lbm * PROTEIN_PER_LBM[goal];
  const fat = m.weight * FAT_PER_KG[goal];
  const carbs = Math.max(0, (kcal - protein * 4 - fat * 9) / 4);

  return {
    lbm: round(lbm, 1),
    bmr: round(bmr),
    tdee: round(maintenance),
    kcal: round(kcal),
    protein: round(protein),
    fat: round(fat),
    carbs: round(carbs),
    surplus: round(kcal - maintenance),
  };
}

/* ------------------------------------------------------------------ */
/* 인바디 피드백 루프                                                   */
/* ------------------------------------------------------------------ */

export interface Adjustment {
  /** 다음 기간 목표 칼로리에 더할 값 (0이면 유지) */
  deltaKcal: number;
  reason: string;
}

/** 두 측정 사이 최소 간격. 이보다 짧으면 노이즈라 판단 보류. */
export const MIN_DAYS_BETWEEN = 14;

function daysBetween(a?: string, b?: string): number | null {
  if (!a || !b) return null;
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.round(ms / 86_400_000);
}

/**
 * 이전 인바디 → 현재 인바디 변화를 보고 칼로리 보정 제안.
 * 규칙은 의도적으로 단순. 한 번에 ±100~150만 움직임.
 */
export function suggestAdjustment(
  prev: BodyMetrics,
  curr: BodyMetrics,
  goal: Goal,
): Adjustment {
  const days = daysBetween(prev.date, curr.date);
  if (days !== null && days < MIN_DAYS_BETWEEN) {
    return {
      deltaKcal: 0,
      reason: `측정 간격 ${days}일. 최소 ${MIN_DAYS_BETWEEN}일 지나고 다시 판단.`,
    };
  }

  const dWeight = curr.weight - prev.weight;
  const dFat = curr.bodyFatPct - prev.bodyFatPct;
  const dSmm =
    curr.skeletalMuscle !== undefined && prev.skeletalMuscle !== undefined
      ? curr.skeletalMuscle - prev.skeletalMuscle
      : null;

  const f = (n: number) => (n > 0 ? `+${round(n, 1)}` : `${round(n, 1)}`);

  switch (goal) {
    case "lean_bulk": {
      if (dFat > 1.0) {
        return {
          deltaKcal: -100,
          reason: `체지방률 ${f(dFat)}%p. 너무 빨리 찜. -100kcal.`,
        };
      }
      if (dSmm !== null && dSmm <= 0 && dWeight < 0.3) {
        return {
          deltaKcal: 100,
          reason: `골격근 ${f(dSmm)}kg, 체중 ${f(dWeight)}kg. 안 늘고 있음. +100kcal.`,
        };
      }
      return { deltaKcal: 0, reason: "추세 정상. 유지." };
    }
    case "bulk": {
      if (dFat > 1.5) {
        return {
          deltaKcal: -150,
          reason: `체지방률 ${f(dFat)}%p. 벌크 치고도 과함. -150kcal.`,
        };
      }
      if (dWeight < 0.5) {
        return {
          deltaKcal: 150,
          reason: `체중 ${f(dWeight)}kg. 벌크 속도 느림. +150kcal.`,
        };
      }
      return { deltaKcal: 0, reason: "추세 정상. 유지." };
    }
    case "cut": {
      if (dSmm !== null && dSmm < -0.5) {
        return {
          deltaKcal: 100,
          reason: `골격근 ${f(dSmm)}kg 빠짐. 근손실. +100kcal + 단백질 확인.`,
        };
      }
      if (dWeight > -0.5) {
        return {
          deltaKcal: -100,
          reason: `체중 ${f(dWeight)}kg. 정체. -100kcal.`,
        };
      }
      return { deltaKcal: 0, reason: "추세 정상. 유지." };
    }
  }
}

/** 하루 물 목표 mL. 체중 × 33, 250 단위 올림, 최소 2,000. */
export function waterTarget(weightKg?: number): number {
  if (!weightKg) return 2000;
  return Math.max(2000, Math.ceil((weightKg * 33) / 250) * 250);
}

/** 나트륨 상태. 권장 2,300 / 상한 3,500 */
export function sodiumStatus(mg: number): "ok" | "warn" | "over" {
  if (mg > 3500) return "over";
  if (mg > 2300) return "warn";
  return "ok";
}
