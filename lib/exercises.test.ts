import { describe, expect, it } from "vitest";
import { koToEnTokens, search } from "./exercises";

describe("koToEnTokens", () => {
  it("한글 외래어를 영문 키워드로", () => {
    expect(koToEnTokens("레그 프레스")).toEqual(["leg", "press"]);
    expect(koToEnTokens("덤벨숄더프레스")).toEqual(["dumbbell", "shoulder", "press"]);
    expect(koToEnTokens("leg press")).toEqual(["leg", "press"]);
  });
  it("부위 이름도", () => {
    expect(koToEnTokens("햄스트링")).toEqual(["hamstring"]);
  });
});

describe("search", () => {
  it("빈 검색은 전체 둘러보기, 대표 종목이 앞", () => {
    const r = search("");
    expect(r.length).toBeGreaterThan(800);
    expect(r.slice(0, 20).every((e) => e.curated)).toBe(true);
  });
  it("한글로 큐레이션 밖 종목도 찾는다", () => {
    const r = search("레그 프레스");
    expect(r.length).toBeGreaterThan(0);
    expect(r.some((e) => /leg press/i.test(e.en))).toBe(true);
  });
  it("한글명 직접 매칭", () => {
    expect(search("머신 플라이")[0].ko).toContain("플라이");
  });
  it("40개 상한", () => {
    expect(search("프레스").length).toBeLessThanOrEqual(40);
  });
});

import { EXERCISES, browse } from "./exercises";
import { autoKo, KO_NAMES } from "./exercise-ko";

describe("한글명 커버리지", () => {
  it("KO_NAMES 의 id 는 전부 실제 종목", () => {
    const ids = new Set(EXERCISES.map((e) => e.id));
    expect(Object.keys(KO_NAMES).filter((k) => !ids.has(k))).toEqual([]);
  });
  it("손으로 이름 붙인 종목이 200개 이상", () => {
    expect(EXERCISES.filter((e) => e.curated).length).toBeGreaterThan(200);
  });
  it("자동 번역이 주요 단어를 바꾼다", () => {
    expect(autoKo("Barbell_Guillotine_Bench_Press")).toBe("바벨 길로틴 벤치프레스");
    expect(autoKo("Back_Flyes_-_With_Bands")).toBe("백 플라이 · 밴드");
    expect(autoKo("Alternate_Heel_Touchers")).toBe("교대 힐 터치");
  });
});

describe("browse", () => {
  it("대표 종목이 먼저, 스트레칭은 뒤", () => {
    const legs = browse("하체");
    expect(legs[0].tier).toBe(0);
    const firstStretch = legs.findIndex((e) => e.stretch);
    const lastNonStretch = legs.length - 1 - [...legs].reverse().findIndex((e) => !e.stretch);
    expect(firstStretch).toBeGreaterThan(lastNonStretch);
  });
  it("그룹별로 다 보인다 (큐레이션만이 아님)", () => {
    expect(browse("가슴").length).toBeGreaterThan(50);
  });
});

describe("search 부위어", () => {
  it("'어깨 프레스' 는 어깨 그룹의 프레스만", () => {
    const r = search("어깨 프레스");
    expect(r.length).toBeGreaterThan(3);
    expect(r.every((e) => e.group === "어깨")).toBe(true);
    expect(r.every((e) => /프레스|press/i.test(e.ko + e.en))).toBe(true);
  });
  it("'햄스트링' 만 치면 근육 필터", () => {
    const r = search("햄스트링");
    expect(r.length).toBeGreaterThan(5);
    expect(r.every((e) => e.muscle === "hamstrings" || e.secondary.includes("hamstrings"))).toBe(true);
  });
});
