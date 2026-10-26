import { describe, expect, it } from "vitest";
import {
  calcTarget,
  leanBodyMass,
  bmrKatchMcArdle,
  suggestAdjustment,
  type BodyMetrics,
} from "./macros";

// 75kg / 체지방 15% 기준 손계산:
// LBM = 63.75, BMR = 370 + 21.6*63.75 = 1747, TDEE(1.55) = 2708
const base: BodyMetrics = { weight: 75, bodyFatPct: 15, skeletalMuscle: 36 };

describe("기본 공식", () => {
  it("제지방량", () => {
    expect(leanBodyMass(base)).toBeCloseTo(63.75, 2);
  });

  it("Katch-McArdle BMR", () => {
    expect(bmrKatchMcArdle(63.75)).toBeCloseTo(1747, 0);
  });
});

describe("calcTarget", () => {
  it("린매스업 = TDEE + 250", () => {
    const t = calcTarget(base, "lean_bulk", "moderate");
    expect(t.tdee).toBe(2708);
    expect(t.kcal).toBe(2958);
    expect(t.surplus).toBe(250);
    expect(t.protein).toBe(147); // 63.75 * 2.3
    expect(t.fat).toBe(68); // 75 * 0.9 = 67.5 → 68
    // carbs = (2958 - 147*4 - 67.5*9) / 4 ≈ 441
    expect(t.carbs).toBeGreaterThan(430);
    expect(t.carbs).toBeLessThan(450);
  });

  it("벌크업 = TDEE + 500, 다이어트 = TDEE - 500", () => {
    expect(calcTarget(base, "bulk").surplus).toBe(500);
    expect(calcTarget(base, "cut").surplus).toBe(-500);
  });

  it("다이어트는 단백질을 더 높게 잡는다", () => {
    expect(calcTarget(base, "cut").protein).toBeGreaterThan(
      calcTarget(base, "bulk").protein,
    );
  });

  it("보정값이 칼로리와 탄수에 반영된다", () => {
    const a = calcTarget(base, "lean_bulk", "moderate", 0);
    const b = calcTarget(base, "lean_bulk", "moderate", -100);
    expect(b.kcal).toBe(a.kcal - 100);
    expect(b.protein).toBe(a.protein); // 단백질은 고정
    expect(b.carbs).toBe(a.carbs - 25); // 100kcal / 4
  });

  it("매크로 kcal 합이 목표 kcal과 맞는다", () => {
    const t = calcTarget(base, "lean_bulk");
    const sum = t.protein * 4 + t.fat * 9 + t.carbs * 4;
    expect(Math.abs(sum - t.kcal)).toBeLessThan(15); // 반올림 오차
  });

  it("탄수는 음수가 되지 않는다", () => {
    const t = calcTarget({ weight: 50, bodyFatPct: 40 }, "cut", "light");
    expect(t.carbs).toBeGreaterThanOrEqual(0);
  });
});

describe("suggestAdjustment (인바디 피드백)", () => {
  const prev: BodyMetrics = {
    weight: 75,
    bodyFatPct: 15,
    skeletalMuscle: 36,
    date: "2026-10-01",
  };

  it("14일 미만이면 판단 보류", () => {
    const r = suggestAdjustment(
      prev,
      { ...prev, weight: 76, date: "2026-10-08" },
      "lean_bulk",
    );
    expect(r.deltaKcal).toBe(0);
    expect(r.reason).toContain("14일");
  });

  it("린매스업: 체지방 +1%p 초과면 -100", () => {
    const r = suggestAdjustment(
      prev,
      { weight: 76.5, bodyFatPct: 16.3, skeletalMuscle: 36.2, date: "2026-10-15" },
      "lean_bulk",
    );
    expect(r.deltaKcal).toBe(-100);
  });

  it("린매스업: 골격근·체중 둘 다 정체면 +100", () => {
    const r = suggestAdjustment(
      prev,
      { weight: 75.1, bodyFatPct: 15, skeletalMuscle: 36, date: "2026-10-15" },
      "lean_bulk",
    );
    expect(r.deltaKcal).toBe(100);
  });

  it("린매스업: 정상 추세면 유지", () => {
    const r = suggestAdjustment(
      prev,
      { weight: 75.6, bodyFatPct: 15.3, skeletalMuscle: 36.4, date: "2026-10-15" },
      "lean_bulk",
    );
    expect(r.deltaKcal).toBe(0);
  });

  it("다이어트: 골격근 -0.5kg 넘게 빠지면 +100 (근손실 방어)", () => {
    const r = suggestAdjustment(
      prev,
      { weight: 73, bodyFatPct: 14, skeletalMuscle: 35.3, date: "2026-10-15" },
      "cut",
    );
    expect(r.deltaKcal).toBe(100);
  });

  it("다이어트: 체중 정체면 -100", () => {
    const r = suggestAdjustment(
      prev,
      { weight: 74.8, bodyFatPct: 15, skeletalMuscle: 36, date: "2026-10-15" },
      "cut",
    );
    expect(r.deltaKcal).toBe(-100);
  });

  it("벌크업: 체중 +0.5 미만이면 +150", () => {
    const r = suggestAdjustment(
      prev,
      { weight: 75.3, bodyFatPct: 15.2, skeletalMuscle: 36.1, date: "2026-10-15" },
      "bulk",
    );
    expect(r.deltaKcal).toBe(150);
  });

  it("골격근 값 없어도 동작한다", () => {
    const r = suggestAdjustment(
      { weight: 75, bodyFatPct: 15, date: "2026-10-01" },
      { weight: 75.5, bodyFatPct: 15.2, date: "2026-10-15" },
      "lean_bulk",
    );
    expect(r.deltaKcal).toBe(0);
  });
});

import { sodiumStatus, waterTarget } from "./macros";
import { scaleItem } from "./types";

describe("물·나트륨", () => {
  it("물 목표 = 체중×33, 250 단위 올림, 최소 2000", () => {
    expect(waterTarget(undefined)).toBe(2000);
    expect(waterTarget(50)).toBe(2000);
    expect(waterTarget(75)).toBe(2500); // 2475 → 2500
    expect(waterTarget(90)).toBe(3000); // 2970 → 3000
  });
  it("나트륨 상태", () => {
    expect(sodiumStatus(1800)).toBe("ok");
    expect(sodiumStatus(2301)).toBe("warn");
    expect(sodiumStatus(3501)).toBe("over");
  });
});

describe("scaleItem (식약처 100g당 값 재계산)", () => {
  const base = { name: "닭가슴살", grams: 100, kcal: 110, protein: 23, fat: 2, carbs: 0, sodium: 50, per100: { kcal: 110, protein: 23, fat: 2, carbs: 0, sodium: 50 } };
  it("g 바꾸면 비례", () => {
    const t = scaleItem(base, 200);
    expect(t.kcal).toBe(220);
    expect(t.protein).toBe(46);
    expect(t.sodium).toBe(100);
  });
  it("per100 없으면 g만 바뀜", () => {
    const t = scaleItem({ ...base, per100: undefined }, 200);
    expect(t.grams).toBe(200);
    expect(t.kcal).toBe(110);
  });
});
