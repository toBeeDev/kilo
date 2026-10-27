import type { Activity, Goal } from "./macros";

export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";

export const SLOT_LABEL: Record<MealSlot, string> = {
  breakfast: "아침",
  lunch: "점심",
  dinner: "저녁",
  snack: "간식",
};

export const SLOTS: MealSlot[] = ["breakfast", "lunch", "dinner", "snack"];

export interface BodyRecord {
  id: string;
  measuredOn: string; // YYYY-MM-DD
  weight: number;
  bodyFatPct: number;
  skeletalMuscle?: number;
  goal: Goal;
  activity: Activity;
  adjustmentKcal: number;
}

export interface MealItem {
  name: string;
  grams: number;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  sodium?: number;
  /** 식약처 DB에서 가져온 100g당 값. 있으면 g 바꿀 때 자동 재계산. */
  per100?: { kcal: number; protein: number; fat: number; carbs: number; sodium: number };
  source?: "ai" | "mfds" | "manual";
}

/** 하루 총평 (LLM 1회/일) */
export interface DaySummary {
  day: string;
  summary: string;
  nextStep: string;
  model?: string;
  generatedAt: string;
}

/** 아이템 g 바꿀 때 per100 있으면 재계산 */
export function scaleItem(i: MealItem, grams: number): MealItem {
  if (!i.per100) return { ...i, grams };
  const f = grams / 100;
  return {
    ...i,
    grams,
    kcal: Math.round(i.per100.kcal * f),
    protein: Math.round(i.per100.protein * f),
    fat: Math.round(i.per100.fat * f),
    carbs: Math.round(i.per100.carbs * f),
    sodium: Math.round(i.per100.sodium * f),
  };
}

export interface MealLog {
  id: string;
  eatenOn: string; // YYYY-MM-DD
  slot: MealSlot;
  rawInput?: string;
  photo?: string; // data URL (local) or public URL (cloud)
  items: MealItem[];
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  sodium?: number;
}

/** 자주 먹는 식단. 한 번 저장하면 사진 안 찍고 바로 기록. */
export interface FavoriteMeal {
  id: string;
  name: string;
  photo?: string;
  items: MealItem[];
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  sodium?: number;
  useCount: number;
  lastUsed?: string; // ISO datetime
}

export interface WorkoutSet {
  id: string;
  doneOn: string; // YYYY-MM-DD
  exerciseId: string;
  setNo: number;
  weight: number;
  reps: number;
  side?: "left" | "right";
  note?: string;
}

/** 루틴 템플릿. 종목 묶음을 이름으로 저장해 두고 한 번에 불러온다. 세트 무게는 불러올 때 지난번 값이 채워진다. */
export interface WorkoutRoutine {
  id: string;
  name: string;
  exerciseIds: string[];
  useCount: number;
  lastUsed?: string; // ISO datetime
}

/** 달력 셀 하나 */
export interface DayTotal {
  day: string;
  kcal: number;
  protein: number;
  meals: number;
  sets: number;
  volume: number;
}

export function sumItems(items: MealItem[]) {
  return items.reduce(
    (a, i) => ({
      kcal: a.kcal + (i.kcal || 0),
      protein: a.protein + (i.protein || 0),
      fat: a.fat + (i.fat || 0),
      carbs: a.carbs + (i.carbs || 0),
      sodium: a.sodium + (i.sodium || 0),
    }),
    { kcal: 0, protein: 0, fat: 0, carbs: 0, sodium: 0 },
  );
}

export const todayStr = () => {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
};

export function shiftDay(day: string, delta: number) {
  const d = new Date(day + "T00:00:00");
  d.setDate(d.getDate() + delta);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

/** 홈 달력 → 운동 탭으로 과거 날짜 넘길 때 쓰는 sessionStorage 키 */
export const WORKOUT_DAY_KEY = "kilo:workout-day";
