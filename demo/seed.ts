/** 처음 열었을 때 비어 있으면 샘플 데이터를 넣는다. 날짜는 오늘 기준 상대값. */
import { shiftDay, todayStr } from "@/lib/types";
import type { BodyRecord, FavoriteMeal, MealItem, MealLog, WorkoutSet } from "@/lib/types";

declare const __RICE_PHOTO__: string;

const K = { body: "kilo:body:v1", meals: "kilo:meals:v1", sets: "kilo:sets:v1", favs: "kilo:favs:v1" };

function meal(id: string, day: string, slot: MealLog["slot"], items: MealItem[], photo?: string): MealLog {
  const sum = (k: keyof MealItem) => items.reduce((a, i) => a + (Number(i[k]) || 0), 0);
  return { id, eatenOn: day, slot, items, kcal: sum("kcal"), protein: sum("protein"), fat: sum("fat"), carbs: sum("carbs"), sodium: sum("sodium"), photo };
}
function st(id: string, day: string, ex: string, n: number, w: number, r: number, side?: "left" | "right"): WorkoutSet {
  return { id, doneOn: day, exerciseId: ex, setNo: n, weight: w, reps: r, ...(side ? { side } : {}) };
}

export function seedIfEmpty() {
  try {
    if (localStorage.getItem(K.body) || localStorage.getItem(K.meals) || localStorage.getItem(K.sets)) return;
    const t = todayStr();
    const d = (n: number) => shiftDay(t, -n);
    const rice = typeof __RICE_PHOTO__ === "string" ? __RICE_PHOTO__ : undefined;

    const body: BodyRecord[] = [
      { id: "b1", measuredOn: d(14), weight: 75.0, bodyFatPct: 15.0, skeletalMuscle: 36.0, goal: "lean_bulk", activity: "moderate", adjustmentKcal: 0 },
      { id: "b2", measuredOn: t, weight: 75.6, bodyFatPct: 15.3, skeletalMuscle: 36.4, goal: "lean_bulk", activity: "moderate", adjustmentKcal: 0 },
    ];
    const meals: MealLog[] = [
      meal("m1", t, "breakfast", [
        { name: "통밀빵 3조각", grams: 90, kcal: 240, protein: 9, fat: 3, carbs: 45, sodium: 380 },
        { name: "프로틴 쉐이크", grams: 300, kcal: 120, protein: 24, fat: 2, carbs: 4, sodium: 120 },
        { name: "연세 복숭아 요거트", grams: 150, kcal: 130, protein: 5, fat: 3, carbs: 20, sodium: 60 },
      ]),
      meal("m2", t, "lunch", [
        { name: "햇반", grams: 210, kcal: 310, protein: 6, fat: 1, carbs: 69, sodium: 5 },
        { name: "훈제 닭가슴살 2팩", grams: 200, kcal: 240, protein: 44, fat: 5, carbs: 2, sodium: 900 },
        { name: "계란 2개", grams: 100, kcal: 150, protein: 13, fat: 10, carbs: 1, sodium: 140 },
      ], rice),
      meal("m3", d(1), "dinner", [
        { name: "오리 소금구이", grams: 250, kcal: 560, protein: 45, fat: 40, carbs: 0, sodium: 700 },
        { name: "밥 1.5공기", grams: 315, kcal: 465, protein: 9, fat: 1, carbs: 103, sodium: 5 },
      ], rice),
      meal("m4", d(1), "lunch", [{ name: "소고기국밥", grams: 600, kcal: 620, protein: 35, fat: 22, carbs: 70, sodium: 1800 }], rice),
    ];
    const sets: WorkoutSet[] = [
      st("s1", t, "Butterfly", 1, 50, 12), st("s2", t, "Butterfly", 2, 60, 12), st("s3", t, "Butterfly", 3, 70, 11),
      st("s4", t, "Smith_Machine_Incline_Bench_Press", 1, 50, 12), st("s5", t, "Smith_Machine_Incline_Bench_Press", 2, 70, 8), st("s6", t, "Smith_Machine_Incline_Bench_Press", 3, 70, 7),
      st("s7", t, "Single-Leg_Leg_Extension", 1, 15, 15, "right"), st("s8", t, "Single-Leg_Leg_Extension", 2, 15, 15, "left"),
      st("s9", d(5), "Butterfly", 1, 40, 12), st("s10", d(5), "Butterfly", 2, 50, 12), st("s11", d(5), "Butterfly", 3, 60, 12), st("s12", d(5), "Butterfly", 4, 70, 11),
      st("s13", d(7), "Leg_Press", 1, 120, 12), st("s14", d(7), "Leg_Press", 2, 140, 10), st("s15", d(7), "Leg_Press", 3, 140, 10),
      st("s16", d(9), "Wide-Grip_Lat_Pulldown", 1, 50, 12), st("s17", d(9), "Seated_Cable_Rows", 1, 55, 12), st("s18", d(9), "Seated_Cable_Rows", 2, 60, 10),
    ];
    const favs: FavoriteMeal[] = [
      { id: "f1", name: "아침 루틴", items: meals[0].items, kcal: meals[0].kcal, protein: meals[0].protein, fat: meals[0].fat, carbs: meals[0].carbs, sodium: meals[0].sodium, useCount: 12, lastUsed: new Date().toISOString() },
      { id: "f2", name: "닭가슴살 점심", photo: rice, items: meals[1].items, kcal: meals[1].kcal, protein: meals[1].protein, fat: meals[1].fat, carbs: meals[1].carbs, sodium: meals[1].sodium, useCount: 7, lastUsed: new Date().toISOString() },
    ];
    // 달력·분석이 보이게 지난 3주치 운동/식단 몇 개 더
    const extraDays = [2, 3, 4, 6, 8, 10, 11, 13, 15, 17, 19, 21];
    for (const n of extraDays) {
      const dd = d(n);
      // 패턴: 0 초과 / 1 목표 근처 / 2 조금 모자람 / 3 많이 모자람
      const duck = [{ name: "오리 소금구이", grams: 300, kcal: 670, protein: 54, fat: 48, carbs: 0, sodium: 800 }, { name: "밥 1.5공기", grams: 315, kcal: 465, protein: 9, fat: 1, carbs: 103, sodium: 5 }];
      const gukbap = [{ name: "소고기국밥", grams: 600, kcal: 620, protein: 35, fat: 22, carbs: 70, sodium: 1800 }, { name: "밥 추가", grams: 100, kcal: 150, protein: 3, fat: 0, carbs: 33, sodium: 2 }];
      const snack = [{ name: "바나나 + 우유", grams: 400, kcal: 400, protein: 17, fat: 10, carbs: 60, sodium: 150 }];
      const late = [{ name: "그릭요거트", grams: 150, kcal: 150, protein: 12, fat: 5, carbs: 12, sodium: 50 }];
      meals.push(meal(`mz${n}`, dd, "breakfast", meals[0].items), meal(`mx${n}`, dd, "lunch", meals[1].items));
      switch (n % 4) {
        case 0: meals.push(meal(`my${n}`, dd, "dinner", duck), meal(`mw${n}`, dd, "snack", snack), meal(`mv${n}`, dd, "snack", [...late, { name: "치킨 3조각", grams: 240, kcal: 560, protein: 40, fat: 32, carbs: 20, sodium: 900 }])); break;
        case 1: meals.push(meal(`my${n}`, dd, "dinner", duck), meal(`mw${n}`, dd, "snack", snack)); break;
        case 2: meals.push(meal(`my${n}`, dd, "dinner", gukbap), meal(`mw${n}`, dd, "snack", late)); break;
        default: meals.push(meal(`my${n}`, dd, "dinner", late));
      }
      const wk = Math.floor(n / 7);
      if (n % 3 === 0) {
        sets.push(st(`c${n}a`, dd, "Butterfly", 1, 50 - wk * 5, 12), st(`c${n}b`, dd, "Butterfly", 2, 60 - wk * 5, 12), st(`c${n}c`, dd, "Butterfly", 3, 65 - wk * 5, 10),
          st(`c${n}d`, dd, "Smith_Machine_Incline_Bench_Press", 1, 60 - wk * 5, 10), st(`c${n}e`, dd, "Smith_Machine_Incline_Bench_Press", 2, 65 - wk * 5, 8));
      } else if (n % 3 === 1) {
        sets.push(st(`l${n}a`, dd, "Leg_Press", 1, 130 - wk * 10, 12), st(`l${n}b`, dd, "Leg_Press", 2, 140 - wk * 10, 10), st(`l${n}c`, dd, "Leg_Extensions", 1, 25, 12), st(`l${n}d`, dd, "Lying_Leg_Curls", 1, 20, 12));
      } else {
        sets.push(st(`b${n}a`, dd, "Wide-Grip_Lat_Pulldown", 1, 55 - wk * 5, 12), st(`b${n}b`, dd, "Wide-Grip_Lat_Pulldown", 2, 60 - wk * 5, 10), st(`b${n}c`, dd, "Seated_Cable_Rows", 1, 60 - wk * 5, 12), st(`b${n}d`, dd, "Face_Pull", 1, 25, 15));
      }
    }
    localStorage.setItem("kilo:water:v1", JSON.stringify({ [t]: 1250, [d(1)]: 2250, [d(2)]: 2000 }));
    localStorage.setItem(
      "kilo:summary:v1",
      JSON.stringify({
        [t]: {
          day: t,
          summary: "아침·점심으로 단백질 101g, 가슴 8세트 4,190kg까진 좋아. 저녁 전인데 단백질 46g, 칼로리 1,777 남았고 물은 절반. 나트륨 1,605mg은 여유 있어.",
          nextStep: "저녁 오리 소금구이 250g + 밥 1.5공기, 자기 전 그릭요거트. 물 500mL 두 번.",
          model: "sample",
          generatedAt: new Date().toISOString(),
        },
        [d(1)]: {
          day: d(1),
          summary: "오리 소금구이로 단백질 161g 채운 건 좋았어. 근데 나트륨 4,150mg은 과해 — 양념 대신 구이로 바꿨는데도 훈제란이랑 국밥이 올렸어. 물은 2,250mL로 목표 근처.",
          nextStep: "점심 훈제닭가슴살 → 삶은계란 2개 + 생닭가슴살 구이로 바꾸고 물 500mL 더.",
          model: "sample",
          generatedAt: new Date().toISOString(),
        },
      }),
    );
    localStorage.setItem(K.favs, JSON.stringify(favs));
    localStorage.setItem(K.body, JSON.stringify(body));
    localStorage.setItem(K.meals, JSON.stringify(meals));
    localStorage.setItem(K.sets, JSON.stringify(sets));
  } catch {
    /* 저장소 막혀 있으면 빈 상태로 */
  }
}
