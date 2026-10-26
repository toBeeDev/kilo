"use client";

import { CloudRepo, LOCAL_KEYS, LocalRepo } from "./repo";
import type { DaySummary } from "./types";

/**
 * 게스트(로컬)로 쓰던 기록을 로그인 후 클라우드로 한 번에 올린다.
 * 성공하면 로컬은 비우고 플래그를 남긴다.
 */

const FLAG = "kilo:migrated:v1";

export interface LocalCounts {
  body: number;
  meals: number;
  sets: number;
  favs: number;
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
  const c = { body: n(LOCAL_KEYS.body), meals: n(LOCAL_KEYS.meals), sets: n(LOCAL_KEYS.sets), favs: n(LOCAL_KEYS.favs), total: 0 };
  c.total = c.body + c.meals + c.sets + c.favs;
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

export async function migrateLocalToCloud(
  cloud: CloudRepo,
  onProgress: (msg: string) => void,
): Promise<LocalCounts> {
  const local = new LocalRepo();
  const counts = localCounts();

  onProgress(`인바디 ${counts.body}개`);
  for (const b of await local.listBody()) {
    await cloud.saveBody({ ...b, id: undefined });
  }

  onProgress(`식사 ${counts.meals}개 (사진 올리는 중)`);
  let i = 0;
  for (const m of (await local.recentMeals(10_000)).concat(await allMealsWithoutPhoto(local))) {
    i += 1;
    let photo = m.photo;
    if (photo?.startsWith("data:")) {
      try {
        photo = await cloud.uploadPhoto(photo, await dataUrlToBlob(photo));
      } catch {
        photo = undefined; // 사진 실패해도 기록은 올린다
      }
    }
    await cloud.saveMeal({ ...m, id: undefined, photo });
    if (i % 5 === 0) onProgress(`식사 ${i}/${counts.meals}`);
  }

  onProgress(`운동 세트 ${counts.sets}개`);
  const allSets = await local.setsInRange("0000-01-01", "9999-12-31");
  // id 그대로 쓰면 uuid 충돌 없음 (로컬 id도 uuid)
  for (let j = 0; j < allSets.length; j += 100) await cloud.saveSets(allSets.slice(j, j + 100));

  onProgress(`즐겨찾기 ${counts.favs}개`);
  for (const f of await local.listFavorites()) {
    let photo = f.photo;
    if (photo?.startsWith("data:")) {
      try {
        photo = await cloud.uploadPhoto(photo, await dataUrlToBlob(photo));
      } catch {
        photo = undefined;
      }
    }
    await cloud.saveFavorite({ ...f, id: undefined, photo });
  }

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

async function allMealsWithoutPhoto(local: LocalRepo) {
  // recentMeals는 사진 있는 것만 → 사진 없는 것도 합친다
  const raw = localStorage.getItem(LOCAL_KEYS.meals);
  if (!raw) return [];
  const rows = JSON.parse(raw) as Awaited<ReturnType<LocalRepo["listMeals"]>>;
  return rows.filter((m) => !m.photo);
}

function readMap<T>(key: string): Record<string, T> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, T>) : {};
  } catch {
    return {};
  }
}
