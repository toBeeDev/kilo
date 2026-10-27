import { describe, expect, it } from "vitest";
import { sanitizeSummaryInput } from "./ai";

describe("sanitizeSummaryInput", () => {
  it("정상 입력은 그대로 통과", () => {
    const out = sanitizeSummaryInput({
      day: "2026-10-27",
      goalLabel: "린매스업",
      target: { kcal: 2500, protein: 160, fat: 70, carbs: 300 },
      actual: { kcal: 2100, protein: 130, fat: 60, carbs: 250, sodium: 2800, waterMl: 1500, waterTarget: 2500 },
      meals: ["점심: 햇반, 닭가슴살 (700kcal)"],
      workout: { volume: 5200, sets: 18, lines: ["벤치 60×10"], muscles: ["가슴"] },
      body: { weight: 75, bodyFatPct: 15 },
    });
    expect(out?.day).toBe("2026-10-27");
    expect(out?.actual.protein).toBe(130);
    expect(out?.workout?.lines).toEqual(["벤치 60×10"]);
  });
  it("날짜/actual 없으면 null", () => {
    expect(sanitizeSummaryInput({ day: "today", actual: {} })).toBeNull();
    expect(sanitizeSummaryInput({ day: "2026-10-27" })).toBeNull();
    expect(sanitizeSummaryInput("x")).toBeNull();
  });
  it("배열·문자열 길이를 자른다", () => {
    const out = sanitizeSummaryInput({
      day: "2026-10-27",
      goalLabel: "a".repeat(500),
      actual: { kcal: "1e9", protein: "abc" },
      meals: Array.from({ length: 100 }, () => "x".repeat(1000)),
      workout: { lines: Array(200).fill("y".repeat(500)), muscles: [] },
    });
    expect(out?.goalLabel.length).toBe(20);
    expect(out?.meals.length).toBe(20);
    expect(out?.meals[0].length).toBe(200);
    expect(out?.workout?.lines.length).toBe(30);
    expect(out?.actual.protein).toBe(0);
    expect(out?.actual.kcal).toBe(1e9);
  });
});

import { validateInbody, validateMealItems } from "./ai";

describe("validateInbody", () => {
  it("정상 값 통과, 날짜 포맷 정리", () => {
    const r = validateInbody({ weight: "75.2kg" as unknown as number, bodyFatPct: 15.3, skeletalMuscle: 36.1, measuredOn: "2026.10.26", confidence: "high" });
    expect(r).toMatchObject({ weight: 75.2, bodyFatPct: 15.3, skeletalMuscle: 36.1, measuredOn: "2026-10-26", confidence: "high" });
  });
  it("범위 밖은 버리고 confidence low", () => {
    const r = validateInbody({ weight: 752, bodyFatPct: 15, confidence: "high" });
    expect(r.weight).toBeUndefined();
    expect(r.confidence).toBe("low");
  });
  it("골격근 > 체중이면 모순 → 골격근 버림", () => {
    const r = validateInbody({ weight: 60, bodyFatPct: 20, skeletalMuscle: 80 });
    expect(r.skeletalMuscle).toBeUndefined();
    expect(r.confidence).toBe("low");
  });
  it("미래 날짜는 버림", () => {
    expect(validateInbody({ measuredOn: "2999-01-01" }).measuredOn).toBeUndefined();
  });
});

describe("validateMealItems", () => {
  it("이름 없음·전부 0·과대값 정리", () => {
    const items = validateMealItems([
      { name: "햇반", grams: 210, kcal: 310, protein: 6, fat: 1, carbs: 69, sodium: 5 },
      { name: "", kcal: 100 },
      { name: "물", grams: 500, kcal: 0, protein: 0, fat: 0, carbs: 0 },
      { name: "폭식", kcal: 999999, protein: -5 },
    ]);
    expect(items.map((i) => i.name)).toEqual(["햇반", "폭식"]);
    expect(items[1].kcal).toBe(10_000);
    expect(items[1].protein).toBe(0);
  });
  it("배열이 아니면 빈 배열, 30개 상한", () => {
    expect(validateMealItems("x")).toEqual([]);
    expect(validateMealItems(Array.from({ length: 50 }, (_, i) => ({ name: "a" + i, kcal: 1 }))).length).toBe(30);
  });
});
