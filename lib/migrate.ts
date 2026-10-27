"use client";

import { CloudRepo, LOCAL_KEYS, LocalRepo } from "./repo";
import { isUuid, uid, type DaySummary, type FavoriteMeal, type MealLog, type WorkoutRoutine, type WorkoutSet } from "./types";

/**
 * 게스트(로컬)로 쓰던 기록을 로그인 후 클라우드로 한 번에 올린다.
 *
 * 멱등성: 로컬 id를 그대로 클라우드 id로 쓰고(upsert), 사진 파일명도 기록 id로 고정한다.
 * 중간에 끊겨서 다시 눌러도 같은 row/파일을 덮어쓸 뿐 중복이 생기지 않는다.
 * 성공해야만 로컬을 비우고 플래그를 남긴다.
 */

const FLAG = "kilo:migrated:v1";

export interface LocalCounts {
  body: number;
  meals: number;
  sets: number;
  favs: number;
  routines: number;
  total: number;
}

export function localCounts(): LocalCounts {
  const n = (k: string) => {
    try {
      const raw = localStorage.getItem(k);
      if (!raw) return 0;
      const v = JSON.parse(raw);
      return Array.isArray(v) ? v.length : Object.keys(v).length;
    } catch {
      return 0;
    }
  };
  const c = { body: n(LOCAL_KEYS.body), meals: n(LOCAL_KEYS.meals), sets: n(LOCAL_KEYS.sets), favs: n(LOCAL_KEYS.favs), routines: n(LOCAL_KEYS.routines), total: 0 };
  c.total = c.body + c.meals + c.sets + c.favs + c.routines;
  return c;
}

export function wasMigrated() {
  try {
    return !!localStorage.getItem(FLAG);
  } catch {
    return false;
  }
}

async function dataUrlToBlob(dataUrl: string) {
  const res = await fetch(dataUrl);
  return res.blob();
}

/**
 * 예전 uid() 폴백으로 만들어진 non-UUID id를 UUID로 바꿔 로컬에 다시 써 둔다.
 * 클라우드 테이블 id는 uuid 타입이라 그대로 올리면 실패한다. 한 번 바꿔 두면 재시도 때도 같은 id.
 */
export function normalizeLocalIds() {
  for (const key of [LOCAL_KEYS.body, LOCAL_KEYS.meals, LOCAL_KEYS.sets, LOCAL_KEYS.favs, LOCAL_KEYS.routines]) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const rows = JSON.parse(raw) as { id?: string }[];
      if (!Array.isArray(rows)) continue;
      let changed = false;
      for (const r of rows) {
        if (!isUuid(r.id)) {
          r.id = uid();
          changed = true;
        }
      }
      if (changed) localStorage.setItem(key, JSON.stringify(rows));
    } catch {
      /* 깨진 키는 건너뛴다 */
    }
  }
}

function readList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    const v = raw ? (JSON.parse(raw) as T[]) : [];
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export async function migrateLocalToCloud(
  cloud: CloudRepo,
  onProgress: (msg: string) => void,
): Promise<LocalCounts> {
  normalizeLocalIds();
  const local = new LocalRepo();
  const counts = localCounts();

  // 사진: data URL이면 기록 id를 파일명으로 올린다 (재시도 시 덮어쓰기)
  const photoOf = async (row: { id: string; photo?: string; photoPath?: string }) => {
    if (row.photoPath) return { photo: row.photo, photoPath: row.photoPath };
    if (!row.photo?.startsWith("data:")) return { photo: undefined, photoPath: undefined };
    try {
      const ref = await cloud.uploadPhoto(row.photo, await dataUrlToBlob(row.photo), row.id);
      return { photo: ref.photo, photoPath: ref.photoPath };
    } catch {
      return { photo: undefined, photoPath: undefined }; // 사진 실패해도 기록은 올린다
    }
  };

  onProgress(`인바디 ${counts.body}개`);
  for (const b of await local.listBody()) {
    await cloud.saveBody({ ...b, id: undefined }); // (user_id, measured_on) upsert
  }

  onProgress(`식사 ${counts.meals}개 (사진 올리는 중)`);
  let i = 0;
  for (const m of readList<MealLog>(LOCAL_KEYS.meals)) {
    i += 1;
    await cloud.saveMeal({ ...m, ...(await photoOf(m)) });
    if (i % 5 === 0) onProgress(`식사 ${i}/${counts.meals}`);
  }

  onProgress(`운동 세트 ${counts.sets}개`);
  const allSets = readList<WorkoutSet>(LOCAL_KEYS.sets);
  for (let j = 0; j < allSets.length; j += 100) await cloud.saveSets(allSets.slice(j, j + 100));

  onProgress(`즐겨찾기 ${counts.favs}개`);
  for (const f of readList<FavoriteMeal>(LOCAL_KEYS.favs)) {
    await cloud.saveFavorite({ ...f, ...(await photoOf(f)) });
  }

  onProgress(`루틴 ${counts.routines}개`);
  for (const r of readList<WorkoutRoutine>(LOCAL_KEYS.routines)) await cloud.saveRoutine(r);

  onProgress("물·총평");
  const water = readMap<number>(LOCAL_KEYS.water);
  for (const [day, ml] of Object.entries(water)) if (ml > 0) await cloud.setWater(day, ml);
  const sums = readMap<DaySummary>(LOCAL_KEYS.summary);
  for (const s of Object.values(sums)) await cloud.saveSummary(s);

  // 끝: 로컬 비우고 플래그
  for (const k of Object.values(LOCAL_KEYS)) localStorage.removeItem(k);
  localStorage.setItem(FLAG, new Date().toISOString());
  return counts;
}

function readMap<T>(key: string): Record<string, T> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, T>) : {};
  } catch {
    return {};
  }
}
