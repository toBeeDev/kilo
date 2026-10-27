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

/**
 * 한글 외래어 → 영문 키워드. 큐레이션 안 된 800여 종목은 한글명이 없어서,
 * "레그 프레스"처럼 치면 이 표로 "leg","press"로 바꿔 영문명에서 찾는다.
 */
const KO_EN: Record<string, string> = {
  레그: "leg", 프레스: "press", 컬: "curl", 로우: "row", 로잉: "row", 풀: "pull", 풀업: "pull-up", 친업: "chin-up", 플라이: "fly", 플라잉: "fly",
  스쿼트: "squat", 데드: "dead", 데드리프트: "deadlift", 런지: "lunge", 익스텐션: "extension", 벤치: "bench", 덤벨: "dumbbell", 바벨: "barbell",
  케이블: "cable", 머신: "machine", 숄더: "shoulder", 레이즈: "raise", 크런치: "crunch", 플랭크: "plank", 힙: "hip", 딥스: "dip", 딥: "dip",
  체스트: "chest", 백: "back", 트라이셉: "tricep", 트라이셉스: "tricep", 바이셉: "bicep", 바이셉스: "bicep", 카프: "calf", 쓰러스트: "thrust",
  스미스: "smith", 케틀벨: "kettlebell", 인클라인: "incline", 디클라인: "decline", 오버헤드: "overhead", 암: "arm", 레터럴: "lateral", 사이드: "side",
  프론트: "front", 리버스: "reverse", 굿모닝: "good morning", 슈러그: "shrug", 푸시업: "push-up", 푸쉬업: "push-up", 싯업: "sit-up", 행잉: "hanging",
  해머: "hammer", 풀오버: "pullover", 풀다운: "pulldown", 랫: "lat", 랫풀다운: "lat pulldown", 페이스풀: "face pull", 킥백: "kickback",
  브릿지: "bridge", 브리지: "bridge", 글루트: "glute", 햄스트링: "hamstring", 스텝업: "step-up", 박스: "box", 점프: "jump", 버피: "burpee",
  마운틴: "mountain", 클라이머: "climber", 트위스트: "twist", 러시안: "russian", 레그레이즈: "leg raise", 니업: "knee", 업라이트: "upright",
  아놀드: "arnold", 밀리터리: "military", 푸시: "push", 프레처: "preacher", 프리처: "preacher", 컨센트레이션: "concentration", 스컬: "skull",
  크러셔: "crusher", 클로즈: "close", 와이드: "wide", 그립: "grip", 뉴트럴: "neutral", 싱글: "single", 원암: "one-arm", 벤트오버: "bent over",
  펜들레이: "pendlay", 티바: "t-bar", 시티드: "seated", 스탠딩: "standing", 라잉: "lying", 핵: "hack", 불가리안: "bulgarian", 스플릿: "split",
  고블릿: "goblet", 프론트스쿼트: "front squat", 힙쓰러스트: "hip thrust", 어덕션: "adduction", 애덕션: "adduction", 어브덕션: "abduction", 밴드: "band",
  폼롤러: "foam", 스트레칭: "stretch", 스트레치: "stretch", 플러터: "flutter", 킥: "kick", 홀드: "hold", 월: "wall", 에어: "air", 바이크: "bike",
  사이클: "cycle", 로프: "rope", 트랩바: "trap bar", 랜드마인: "landmine", 메디신볼: "medicine ball", 스윙: "swing", 스내치: "snatch", 클린: "clean",
  저크: "jerk", 턱: "tuck", 사이드벤드: "side bend", 벤드: "bend", 윈드밀: "windmill", 터키시: "turkish", 겟업: "get-up", 슈퍼맨: "superman", 버드독: "bird dog",
  데드버그: "dead bug", 할로우: "hollow", 브이업: "v-up", 토터치: "toe touch", 크로스오버: "crossover", 디클라인벤치: "decline bench", 펙덱: "pec deck",
};
const MUSCLE_EN: Record<string, string> = Object.fromEntries(Object.entries(MUSCLE_KO).map(([en, ko]) => [ko, en]));

/** 한글 질의를 영문 키워드 배열로. 표에 있는 가장 긴 조각부터 잘라 간다. 모르는 조각은 그대로 둔다. */
export function koToEnTokens(q: string): string[] {
  const out: string[] = [];
  for (const chunk of q.trim().toLowerCase().split(/\s+/)) {
    if (!/[가-힣]/.test(chunk)) {
      if (chunk) out.push(chunk);
      continue;
    }
    let rest = chunk;
    while (rest) {
      let hit = "";
      for (let len = Math.min(rest.length, 8); len >= 1; len--) {
        const piece = rest.slice(0, len);
        if (KO_EN[piece] || MUSCLE_EN[piece]) {
          hit = KO_EN[piece] ?? MUSCLE_EN[piece];
          rest = rest.slice(len);
          break;
        }
      }
      if (hit) out.push(...hit.split(" "));
      else {
        out.push(rest[0]); // 모르는 글자는 한글 그대로 (한글명 매칭용)
        rest = rest.slice(1);
      }
    }
  }
  return out;
}

const norm = (s: string) => s.toLowerCase().replace(/[\s\-_]+/g, "");

/** 한글/영문 둘 다 검색. 큐레이션 먼저, 그다음 전체(876개). 결과 30개. */
export function search(q: string, group?: string): Exercise[] {
  const raw = norm(q);
  if (!raw) return EXERCISES.filter((e) => (!group || e.group === group) && e.curated);
  const tokens = koToEnTokens(q).map(norm).filter(Boolean);
  const ko = raw.replace(/[^가-힣]/g, "");
  const hits = EXERCISES.filter((e) => {
    if (group && e.group !== group) return false;
    const nko = norm(e.ko);
    const nen = norm(e.en);
    if (nko.includes(raw) || nen.includes(raw)) return true; // 그대로 들어 있으면 끝
    if (ko && nko.includes(ko) && nko !== nen) return true; // 한글명에 한글 조각이 있으면
    // 영문 키워드: 전부 들어 있어야 한다 ("leg" + "press")
    return tokens.length > 0 && tokens.every((t) => nen.includes(t) || nko.includes(t) || MUSCLE_KO[e.muscle] === t);
  });
  // 큐레이션 → 영문명 짧은 순(정확한 이름이 위로)
  return hits.sort((a, b) => Number(b.curated) - Number(a.curated) || a.en.length - b.en.length).slice(0, 30);
}

/** Epley 1RM */
export const oneRm = (w: number, reps: number) => (reps <= 1 ? w : w * (1 + reps / 30));
