"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { BodyRecord, DaySummary, DayTotal, FavoriteMeal, MealLog, WorkoutSet } from "./types";
import { uid } from "./types";

/**
 * 저장소 추상화.
 * - LocalRepo: localStorage. 키/로그인 없이 지금 당장 동작.
 * - CloudRepo: Supabase. 로그인하면 자동 전환.
 * UI는 이 인터페이스만 본다.
 */
export interface Repo {
  readonly mode: "local" | "cloud";

  listBody(): Promise<BodyRecord[]>; // 최신순
  saveBody(r: Omit<BodyRecord, "id"> & { id?: string }): Promise<BodyRecord>;
  deleteBody(id: string): Promise<void>;

  listMeals(day: string): Promise<MealLog[]>;
  recentMeals(limit: number): Promise<MealLog[]>; // 사진 그리드용
  saveMeal(m: Omit<MealLog, "id"> & { id?: string }): Promise<MealLog>;
  deleteMeal(id: string): Promise<void>;

  listFavorites(): Promise<FavoriteMeal[]>; // 많이 쓴 순
  saveFavorite(f: Omit<FavoriteMeal, "id" | "useCount" | "lastUsed"> & { id?: string }): Promise<FavoriteMeal>;
  touchFavorite(id: string): Promise<void>; // 사용 횟수 +1
  deleteFavorite(id: string): Promise<void>;

  listSets(day: string): Promise<WorkoutSet[]>;
  lastSets(exerciseId: string, beforeDay: string): Promise<WorkoutSet[]>; // 이전 세션 자동 채움
  saveSets(sets: WorkoutSet[]): Promise<void>;
  deleteSet(id: string): Promise<void>;
  recentWorkoutDays(limit: number): Promise<{ day: string; volume: number; sets: number }[]>;
  /** 분석용: 기간 내 모든 세트 */
  setsInRange(from: string, to: string): Promise<WorkoutSet[]>;
  /** 달력용: 기간 내 날짜별 식단·운동 합계 */
  dailyTotals(from: string, to: string): Promise<DayTotal[]>;

  getWater(day: string): Promise<number>;
  setWater(day: string, ml: number): Promise<void>;
  getSummary(day: string): Promise<DaySummary | null>;
  saveSummary(s: DaySummary): Promise<void>;

  /** 사진 저장. 로컬은 data URL 그대로, 클라우드는 Storage URL 반환. */
  uploadPhoto(dataUrl: string, blob: Blob): Promise<string>;
}

/* ------------------------------------------------------------------ */
/* Local                                                               */
/* ------------------------------------------------------------------ */

const K = {
  body: "kilo:body:v1",
  meals: "kilo:meals:v1",
  sets: "kilo:sets:v1",
  favs: "kilo:favs:v1",
  water: "kilo:water:v1",
  summary: "kilo:summary:v1",
};
export const LOCAL_KEYS = K;

function readMap<T>(key: string): Record<string, T> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, T>) : {};
  } catch {
    return {};
  }
}

const sortFavs = (rows: FavoriteMeal[]) =>
  rows.sort((a, b) => b.useCount - a.useCount || (a.lastUsed ?? "") < (b.lastUsed ?? "") ? 1 : -1);

function read<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}
function write<T>(key: string, rows: T[]) {
  localStorage.setItem(key, JSON.stringify(rows));
}

export class LocalRepo implements Repo {
  readonly mode = "local" as const;

  async listBody() {
    return read<BodyRecord>(K.body).sort((a, b) => (a.measuredOn < b.measuredOn ? 1 : -1));
  }
  async saveBody(r: Omit<BodyRecord, "id"> & { id?: string }) {
    const rows = read<BodyRecord>(K.body);
    const row: BodyRecord = { ...r, id: r.id ?? uid() };
    const i = rows.findIndex((x) => x.id === row.id || x.measuredOn === row.measuredOn);
    if (i >= 0) rows[i] = { ...row, id: rows[i].id };
    else rows.push(row);
    write(K.body, rows);
    return i >= 0 ? rows[i] : row;
  }
  async deleteBody(id: string) {
    write(K.body, read<BodyRecord>(K.body).filter((x) => x.id !== id));
  }

  async listMeals(day: string) {
    return read<MealLog>(K.meals).filter((m) => m.eatenOn === day);
  }
  async recentMeals(limit: number) {
    return read<MealLog>(K.meals)
      .filter((m) => m.photo)
      .sort((a, b) => (a.eatenOn < b.eatenOn ? 1 : -1))
      .slice(0, limit);
  }
  async saveMeal(m: Omit<MealLog, "id"> & { id?: string }) {
    const rows = read<MealLog>(K.meals);
    const row: MealLog = { ...m, id: m.id ?? uid() };
    const i = rows.findIndex((x) => x.id === row.id);
    if (i >= 0) rows[i] = row;
    else rows.push(row);
    try {
      write(K.meals, rows);
    } catch {
      // 용량 초과 시 사진 없이 저장
      row.photo = undefined;
      if (i >= 0) rows[i] = row;
      write(K.meals, rows);
    }
    return row;
  }
  async deleteMeal(id: string) {
    write(K.meals, read<MealLog>(K.meals).filter((x) => x.id !== id));
  }

  async listFavorites() {
    return sortFavs(read<FavoriteMeal>(K.favs));
  }
  async saveFavorite(f: Omit<FavoriteMeal, "id" | "useCount" | "lastUsed"> & { id?: string }) {
    const rows = read<FavoriteMeal>(K.favs);
    const i = rows.findIndex((x) => x.id === f.id);
    const row: FavoriteMeal = { useCount: 0, ...(i >= 0 ? rows[i] : {}), ...f, id: f.id ?? uid() };
    if (i >= 0) rows[i] = row;
    else rows.push(row);
    try {
      write(K.favs, rows);
    } catch {
      row.photo = undefined;
      write(K.favs, rows);
    }
    return row;
  }
  async touchFavorite(id: string) {
    const rows = read<FavoriteMeal>(K.favs);
    const r = rows.find((x) => x.id === id);
    if (!r) return;
    r.useCount += 1;
    r.lastUsed = new Date().toISOString();
    write(K.favs, rows);
  }
  async deleteFavorite(id: string) {
    write(K.favs, read<FavoriteMeal>(K.favs).filter((x) => x.id !== id));
  }

  async listSets(day: string) {
    return read<WorkoutSet>(K.sets)
      .filter((s) => s.doneOn === day)
      .sort((a, b) => a.setNo - b.setNo);
  }
  async lastSets(exerciseId: string, beforeDay: string) {
    const rows = read<WorkoutSet>(K.sets).filter(
      (s) => s.exerciseId === exerciseId && s.doneOn < beforeDay,
    );
    if (!rows.length) return [];
    const lastDay = rows.reduce((m, s) => (s.doneOn > m ? s.doneOn : m), "");
    return rows.filter((s) => s.doneOn === lastDay).sort((a, b) => a.setNo - b.setNo);
  }
  async saveSets(sets: WorkoutSet[]) {
    const rows = read<WorkoutSet>(K.sets);
    for (const s of sets) {
      const i = rows.findIndex((x) => x.id === s.id);
      if (i >= 0) rows[i] = s;
      else rows.push(s);
    }
    write(K.sets, rows);
  }
  async deleteSet(id: string) {
    write(K.sets, read<WorkoutSet>(K.sets).filter((x) => x.id !== id));
  }
  async recentWorkoutDays(limit: number) {
    const by = new Map<string, { volume: number; sets: number }>();
    for (const s of read<WorkoutSet>(K.sets)) {
      const cur = by.get(s.doneOn) ?? { volume: 0, sets: 0 };
      cur.volume += s.weight * s.reps;
      cur.sets += 1;
      by.set(s.doneOn, cur);
    }
    return [...by.entries()]
      .map(([day, v]) => ({ day, ...v }))
      .sort((a, b) => (a.day < b.day ? 1 : -1))
      .slice(0, limit);
  }

  async setsInRange(from: string, to: string) {
    return read<WorkoutSet>(K.sets)
      .filter((s) => s.doneOn >= from && s.doneOn <= to)
      .sort((a, b) => (a.doneOn === b.doneOn ? a.setNo - b.setNo : a.doneOn < b.doneOn ? -1 : 1));
  }
  async dailyTotals(from: string, to: string) {
    const by = new Map<string, DayTotal>();
    const get = (day: string) => {
      let t = by.get(day);
      if (!t) {
        t = { day, kcal: 0, protein: 0, meals: 0, sets: 0, volume: 0 };
        by.set(day, t);
      }
      return t;
    };
    for (const m of read<MealLog>(K.meals)) {
      if (m.eatenOn < from || m.eatenOn > to) continue;
      const t = get(m.eatenOn);
      t.kcal += m.kcal;
      t.protein += m.protein;
      t.meals += 1;
    }
    for (const s of read<WorkoutSet>(K.sets)) {
      if (s.doneOn < from || s.doneOn > to) continue;
      const t = get(s.doneOn);
      t.sets += 1;
      t.volume += s.weight * s.reps;
    }
    return [...by.values()].sort((a, b) => (a.day < b.day ? -1 : 1));
  }

  async getWater(day: string) {
    return readMap<number>(K.water)[day] ?? 0;
  }
  async setWater(day: string, ml: number) {
    const m = readMap<number>(K.water);
    m[day] = Math.max(0, ml);
    localStorage.setItem(K.water, JSON.stringify(m));
  }
  async getSummary(day: string) {
    return readMap<DaySummary>(K.summary)[day] ?? null;
  }
  async saveSummary(s: DaySummary) {
    const m = readMap<DaySummary>(K.summary);
    m[s.day] = s;
    localStorage.setItem(K.summary, JSON.stringify(m));
  }

  async uploadPhoto(dataUrl: string) {
    return dataUrl;
  }
}

/* ------------------------------------------------------------------ */
/* Cloud (Supabase)                                                    */
/* ------------------------------------------------------------------ */

type Row = Record<string, unknown>;

export class CloudRepo implements Repo {
  readonly mode = "cloud" as const;
  constructor(
    private sb: SupabaseClient,
    private userId: string,
  ) {}

  private bodyFrom(r: Row): BodyRecord {
    return {
      id: r.id as string,
      measuredOn: r.measured_on as string,
      weight: Number(r.weight_kg),
      bodyFatPct: Number(r.body_fat_pct),
      skeletalMuscle: r.skeletal_muscle_kg == null ? undefined : Number(r.skeletal_muscle_kg),
      goal: r.goal as BodyRecord["goal"],
      activity: r.activity as BodyRecord["activity"],
      adjustmentKcal: Number(r.adjustment_kcal ?? 0),
    };
  }
  async listBody() {
    const { data, error } = await this.sb
      .from("body_metrics")
      .select("*")
      .order("measured_on", { ascending: false });
    if (error) throw error;
    return (data as Row[]).map((r) => this.bodyFrom(r));
  }
  async saveBody(r: Omit<BodyRecord, "id"> & { id?: string }) {
    const { data, error } = await this.sb
      .from("body_metrics")
      .upsert(
        {
          ...(r.id ? { id: r.id } : {}),
          user_id: this.userId,
          measured_on: r.measuredOn,
          weight_kg: r.weight,
          body_fat_pct: r.bodyFatPct,
          skeletal_muscle_kg: r.skeletalMuscle ?? null,
          goal: r.goal,
          activity: r.activity,
          adjustment_kcal: r.adjustmentKcal,
        },
        { onConflict: "user_id,measured_on" },
      )
      .select()
      .single();
    if (error) throw error;
    return this.bodyFrom(data as Row);
  }
  async deleteBody(id: string) {
    const { error } = await this.sb.from("body_metrics").delete().eq("id", id);
    if (error) throw error;
  }

  private mealFrom(r: Row): MealLog {
    return {
      id: r.id as string,
      eatenOn: r.eaten_on as string,
      slot: r.slot as MealLog["slot"],
      rawInput: (r.raw_input as string) ?? undefined,
      photo: (r.photo_path as string) ?? undefined,
      items: (r.items as MealLog["items"]) ?? [],
      kcal: Number(r.kcal),
      protein: Number(r.protein_g),
      fat: Number(r.fat_g),
      carbs: Number(r.carbs_g),
      sodium: r.sodium_mg == null ? undefined : Number(r.sodium_mg),
    };
  }
  async listMeals(day: string) {
    const { data, error } = await this.sb
      .from("meal_logs")
      .select("*")
      .eq("eaten_on", day)
      .order("created_at");
    if (error) throw error;
    return (data as Row[]).map((r) => this.mealFrom(r));
  }
  async recentMeals(limit: number) {
    const { data, error } = await this.sb
      .from("meal_logs")
      .select("*")
      .not("photo_path", "is", null)
      .order("eaten_on", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data as Row[]).map((r) => this.mealFrom(r));
  }
  async saveMeal(m: Omit<MealLog, "id"> & { id?: string }) {
    const { data, error } = await this.sb
      .from("meal_logs")
      .upsert({
        ...(m.id ? { id: m.id } : {}),
        user_id: this.userId,
        eaten_on: m.eatenOn,
        slot: m.slot,
        raw_input: m.rawInput ?? null,
        photo_path: m.photo ?? null,
        items: m.items,
        kcal: m.kcal,
        protein_g: m.protein,
        fat_g: m.fat,
        carbs_g: m.carbs,
        sodium_mg: m.sodium ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return this.mealFrom(data as Row);
  }
  async deleteMeal(id: string) {
    const { error } = await this.sb.from("meal_logs").delete().eq("id", id);
    if (error) throw error;
  }

  private favFrom(r: Row): FavoriteMeal {
    return {
      id: r.id as string,
      name: r.name as string,
      photo: (r.photo_path as string) ?? undefined,
      items: (r.items as FavoriteMeal["items"]) ?? [],
      kcal: Number(r.kcal),
      protein: Number(r.protein_g),
      fat: Number(r.fat_g),
      carbs: Number(r.carbs_g),
      sodium: r.sodium_mg == null ? undefined : Number(r.sodium_mg),
      useCount: Number(r.use_count ?? 0),
      lastUsed: (r.last_used_at as string) ?? undefined,
    };
  }
  async listFavorites() {
    const { data, error } = await this.sb
      .from("favorite_meals")
      .select("*")
      .order("use_count", { ascending: false })
      .order("last_used_at", { ascending: false, nullsFirst: false });
    if (error) throw error;
    return (data as Row[]).map((r) => this.favFrom(r));
  }
  async saveFavorite(f: Omit<FavoriteMeal, "id" | "useCount" | "lastUsed"> & { id?: string }) {
    const { data, error } = await this.sb
      .from("favorite_meals")
      .upsert({
        ...(f.id ? { id: f.id } : {}),
        user_id: this.userId,
        name: f.name,
        photo_path: f.photo ?? null,
        items: f.items,
        kcal: f.kcal,
        protein_g: f.protein,
        fat_g: f.fat,
        carbs_g: f.carbs,
        sodium_mg: f.sodium ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return this.favFrom(data as Row);
  }
  async touchFavorite(id: string) {
    const { error } = await this.sb.rpc("touch_favorite_meal", { fav_id: id });
    if (error) throw error;
  }
  async deleteFavorite(id: string) {
    const { error } = await this.sb.from("favorite_meals").delete().eq("id", id);
    if (error) throw error;
  }

  private setFrom(r: Row): WorkoutSet {
    return {
      id: r.id as string,
      doneOn: r.done_on as string,
      exerciseId: r.exercise_key as string,
      setNo: Number(r.set_no),
      weight: Number(r.weight_kg),
      reps: Number(r.reps),
      side: (r.side as WorkoutSet["side"]) ?? undefined,
      note: (r.note as string) ?? undefined,
    };
  }
  async listSets(day: string) {
    const { data, error } = await this.sb
      .from("workout_sets")
      .select("*")
      .eq("done_on", day)
      .order("created_at")
      .order("set_no");
    if (error) throw error;
    return (data as Row[]).map((r) => this.setFrom(r));
  }
  async lastSets(exerciseId: string, beforeDay: string) {
    const { data, error } = await this.sb
      .from("workout_sets")
      .select("*")
      .eq("exercise_key", exerciseId)
      .lt("done_on", beforeDay)
      .order("done_on", { ascending: false })
      .order("set_no")
      .limit(12);
    if (error) throw error;
    const rows = (data as Row[]).map((r) => this.setFrom(r));
    if (!rows.length) return [];
    return rows.filter((s) => s.doneOn === rows[0].doneOn);
  }
  async saveSets(sets: WorkoutSet[]) {
    if (!sets.length) return;
    const { error } = await this.sb.from("workout_sets").upsert(
      sets.map((s) => ({
        id: s.id,
        user_id: this.userId,
        done_on: s.doneOn,
        exercise_key: s.exerciseId,
        set_no: s.setNo,
        weight_kg: s.weight,
        reps: s.reps,
        side: s.side ?? null,
        note: s.note ?? null,
      })),
    );
    if (error) throw error;
  }
  async deleteSet(id: string) {
    const { error } = await this.sb.from("workout_sets").delete().eq("id", id);
    if (error) throw error;
  }
  async recentWorkoutDays(limit: number) {
    const { data, error } = await this.sb
      .from("v_daily_workout")
      .select("day, volume_kg, sets")
      .order("day", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data as Row[]).map((r) => ({
      day: r.day as string,
      volume: Number(r.volume_kg),
      sets: Number(r.sets),
    }));
  }

  async setsInRange(from: string, to: string) {
    const { data, error } = await this.sb
      .from("workout_sets")
      .select("*")
      .gte("done_on", from)
      .lte("done_on", to)
      .order("done_on")
      .order("set_no");
    if (error) throw error;
    return (data as Row[]).map((r) => this.setFrom(r));
  }
  async dailyTotals(from: string, to: string) {
    const [a, b] = await Promise.all([
      this.sb.from("v_daily_intake").select("day, kcal, protein_g, meals").gte("day", from).lte("day", to),
      this.sb.from("v_daily_workout").select("day, volume_kg, sets").gte("day", from).lte("day", to),
    ]);
    if (a.error) throw a.error;
    if (b.error) throw b.error;
    const by = new Map<string, DayTotal>();
    const get = (day: string) => {
      let t = by.get(day);
      if (!t) {
        t = { day, kcal: 0, protein: 0, meals: 0, sets: 0, volume: 0 };
        by.set(day, t);
      }
      return t;
    };
    for (const r of a.data as Row[]) {
      const t = get(r.day as string);
      t.kcal = Number(r.kcal);
      t.protein = Number(r.protein_g);
      t.meals = Number(r.meals ?? 0);
    }
    for (const r of b.data as Row[]) {
      const t = get(r.day as string);
      t.sets = Number(r.sets);
      t.volume = Number(r.volume_kg);
    }
    return [...by.values()].sort((x, y) => (x.day < y.day ? -1 : 1));
  }

  async getWater(day: string) {
    const { data, error } = await this.sb.from("daily_summary").select("water_ml").eq("day", day).maybeSingle();
    if (error) throw error;
    return Number((data as Row | null)?.water_ml ?? 0);
  }
  async setWater(day: string, ml: number) {
    const { error } = await this.sb
      .from("daily_summary")
      .upsert({ user_id: this.userId, day, water_ml: Math.max(0, ml) }, { onConflict: "user_id,day" });
    if (error) throw error;
  }
  async getSummary(day: string) {
    const { data, error } = await this.sb
      .from("daily_summary")
      .select("ai_summary, ai_next_step, ai_model, generated_at")
      .eq("day", day)
      .maybeSingle();
    if (error) throw error;
    const r = data as Row | null;
    if (!r?.ai_summary) return null;
    return {
      day,
      summary: r.ai_summary as string,
      nextStep: (r.ai_next_step as string) ?? "",
      model: (r.ai_model as string) ?? undefined,
      generatedAt: (r.generated_at as string) ?? new Date().toISOString(),
    };
  }
  async saveSummary(s: DaySummary) {
    const { error } = await this.sb.from("daily_summary").upsert(
      { user_id: this.userId, day: s.day, ai_summary: s.summary, ai_next_step: s.nextStep, ai_model: s.model ?? null, generated_at: s.generatedAt },
      { onConflict: "user_id,day" },
    );
    if (error) throw error;
  }

  async uploadPhoto(_dataUrl: string, blob: Blob) {
    const path = `${this.userId}/${uid()}.jpg`;
    const { error } = await this.sb.storage
      .from("meal-photos")
      .upload(path, blob, { contentType: "image/jpeg", upsert: false });
    if (error) throw error;
    return this.sb.storage.from("meal-photos").getPublicUrl(path).data.publicUrl;
  }
}
