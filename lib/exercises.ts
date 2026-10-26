import data from "./exercises.json";

/**
 * 종목 데이터. 출처: free-exercise-db (퍼블릭 도메인, 실제 기구 사진 시작/끝 2프레임).
 * 영상으로 바꾸고 싶으면 media()만 갈아끼우면 됨 (wger CC-BY-SA 영상 등).
 */

export type Muscle =
  | "chest" | "shoulders" | "biceps" | "triceps" | "forearms" | "abdominals"
  | "quadriceps" | "hamstrings" | "glutes" | "calves" | "adductors" | "abductors"
  | "lats" | "middle back" | "lower back" | "traps" | "neck";

export const MUSCLE_KO: Record<Muscle, string> = {
  chest: "가슴", shoulders: "어깨", biceps: "이두", triceps: "삼두", forearms: "전완", abdominals: "복근",
  quadriceps: "대퇴사두", hamstrings: "햄스트링", glutes: "둔근", calves: "종아리", adductors: "내전근", abductors: "외전근",
  lats: "광배", "middle back": "등 중부", "lower back": "허리", traps: "승모", neck: "목",
};

export interface Exercise {
  id: string;
  ko: string; // 한글명 (큐레이션 안 된 건 영문 그대로)
  en: string;
  group: string; // 가슴 | 등 | 하체 | 어깨 | 팔 | 코어 | 기타
  equipment: string;
  muscle: Muscle;
  secondary: Muscle[];
  steps?: string[];
  curated: boolean;
}

interface Curated {
  id: string;
  ko: string;
  en: string;
  group: string;
  muscle: Muscle;
  secondary?: Muscle[];
  equipment: string;
  steps: string[];
}
interface Minimal {
  id: string;
  en: string;
  group: string;
  equipment: string;
  m: Muscle;
  s?: Muscle[];
}

const BASE = (data as { base: string }).base;
const curated = (data as { curated: Curated[] }).curated;
const all = (data as { all: Minimal[] }).all;

const curatedIds = new Set(curated.map((c) => c.id));

export const GROUPS = ["가슴", "등", "하체", "어깨", "팔", "코어"] as const;

export const EXERCISES: Exercise[] = [
  ...curated.map((c) => ({ ...c, secondary: c.secondary ?? [], curated: true })),
  ...all
    .filter((e) => !curatedIds.has(e.id))
    .map((e) => ({
      id: e.id, ko: e.en, en: e.en, group: e.group, equipment: e.equipment,
      muscle: e.m, secondary: e.s ?? [], curated: false,
    })),
];

const byId = new Map(EXERCISES.map((e) => [e.id, e]));

export function exercise(id: string): Exercise {
  return (
    byId.get(id) ?? { id, ko: id.replace(/_/g, " "), en: id, group: "기타", equipment: "기타", muscle: "neck", secondary: [], curated: false }
  );
}

/** 오프라인 번들(데모)에서 로컬 파일로 바꿔치기할 수 있게 훅 하나 열어둠. */
declare global {
  var __kiloMedia: ((id: string) => [string, string] | null) | undefined;
}

export function media(id: string): [string, string] {
  const o = globalThis.__kiloMedia?.(id);
  if (o) return o;
  return [`${BASE}${id}/0.jpg`, `${BASE}${id}/1.jpg`];
}

/** 한글/영문 둘 다 검색. 큐레이션 먼저. */
export function search(q: string, group?: string): Exercise[] {
  const s = q.trim().toLowerCase().replace(/\s+/g, "");
  return EXERCISES.filter((e) => {
    if (group && e.group !== group) return false;
    if (!s) return e.curated;
    return e.ko.toLowerCase().replace(/\s+/g, "").includes(s) || e.en.toLowerCase().replace(/\s+/g, "").includes(s);
  }).slice(0, 40);
}

/** Epley 1RM */
export const oneRm = (w: number, reps: number) => (reps <= 1 ? w : w * (1 + reps / 30));
