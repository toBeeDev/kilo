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
