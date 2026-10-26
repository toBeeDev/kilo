import { describe, expect, it, vi, afterEach } from "vitest";
import { searchFood } from "./mfds";

const sample = {
  header: { resultCode: "00" },
  body: {
    items: [
      { FOOD_NM_KR: "닭가슴살, 훈제", MAKER_NM: "하림", NUTRI_AMOUNT_SERVING: "100g", SERVING_SIZE: "1팩(100g)", AMT_NUM1: "118", AMT_NUM3: "24.3", AMT_NUM4: "2.1", AMT_NUM6: "1.5", AMT_NUM13: "560" },
      { FOOD_NM_KR: "즉석밥", NUTRI_AMOUNT_SERVING: "210g", SERVING_SIZE: "1개(210g)", AMT_NUM1: "310", AMT_NUM3: "6", AMT_NUM4: "1", AMT_NUM6: "69", AMT_NUM13: "5" },
    ],
  },
};

afterEach(() => vi.unstubAllGlobals());

describe("searchFood", () => {
  it("100g당으로 환산하고 1회 제공량을 파싱한다", async () => {
    process.env.MFDS_API_KEY = "x";
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(sample), { status: 200 })));
    const hits = await searchFood("닭가슴살");
    expect(hits).toHaveLength(2);
    expect(hits[0].name).toBe("닭가슴살, 훈제");
    expect(hits[0].maker).toBe("하림");
    expect(hits[0].servingG).toBe(100);
    expect(hits[0].per100.kcal).toBe(118);
    expect(hits[0].per100.sodium).toBe(560);
    // 기준량 210g → 100g당 환산
    expect(hits[1].servingG).toBe(210);
    expect(hits[1].per100.kcal).toBe(Math.round(310 / 2.1));
    expect(hits[1].per100.carbs).toBe(Math.round((69 / 2.1) * 10) / 10);
  });
  it("XML 에러를 메시지로 바꾼다", async () => {
    process.env.MFDS_API_KEY = "x";
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<r><returnAuthMsg>SERVICE_KEY_IS_NOT_REGISTERED_ERROR</returnAuthMsg></r>", { status: 200 })));
    await expect(searchFood("x")).rejects.toThrow("SERVICE_KEY_IS_NOT_REGISTERED_ERROR");
  });
});
