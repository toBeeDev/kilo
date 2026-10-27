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
  it("빈 검색은 큐레이션만", () => {
    const r = search("");
    expect(r.length).toBeGreaterThan(10);
    expect(r.every((e) => e.curated)).toBe(true);
  });
  it("한글로 큐레이션 밖 종목도 찾는다", () => {
    const r = search("레그 프레스");
    expect(r.length).toBeGreaterThan(0);
    expect(r.some((e) => /leg press/i.test(e.en))).toBe(true);
  });
  it("한글명 직접 매칭", () => {
    expect(search("머신 플라이")[0].ko).toContain("플라이");
  });
  it("30개 상한", () => {
    expect(search("프레스").length).toBeLessThanOrEqual(30);
  });
});
