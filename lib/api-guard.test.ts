import { beforeEach, describe, expect, it, vi } from "vitest";

vi.stubEnv("AI_LIMIT_SECRET", "test-secret");
const { _internal } = await import("./api-guard");
const { parseQuota, serializeQuota, hitBurst, todayKey } = _internal;

describe("quota cookie", () => {
  it("직렬화 → 파싱 왕복", () => {
    const u = { day: todayKey(), photo: 3, summary: 1, food: 7 };
    expect(parseQuota(serializeQuota(u))).toEqual(u);
  });
  it("서명이 깨지면 0으로", () => {
    const raw = serializeQuota({ day: todayKey(), photo: 19, summary: 2, food: 0 });
    const tampered = raw.replace(":19:", ":1:");
    expect(parseQuota(tampered)).toEqual({ day: todayKey(), photo: 0, summary: 0, food: 0 });
  });
  it("어제 쿠키는 0으로 (자정 리셋)", () => {
    const raw = serializeQuota({ day: "2000-01-01", photo: 20, summary: 3, food: 100 });
    expect(parseQuota(raw).photo).toBe(0);
  });
  it("없거나 이상한 값도 0", () => {
    expect(parseQuota(undefined).photo).toBe(0);
    expect(parseQuota("garbage").summary).toBe(0);
  });
});

describe("burst", () => {
  beforeEach(() => vi.useRealTimers());
  it("분당 한도 넘으면 false", () => {
    const key = "test:" + Math.random();
    for (let i = 0; i < 5; i++) expect(hitBurst(key, 5)).toBe(true);
    expect(hitBurst(key, 5)).toBe(false);
  });
  it("1분 지나면 다시 허용", () => {
    vi.useFakeTimers();
    const key = "test2:" + Math.random();
    expect(hitBurst(key, 1)).toBe(true);
    expect(hitBurst(key, 1)).toBe(false);
    vi.advanceTimersByTime(61_000);
    expect(hitBurst(key, 1)).toBe(true);
  });
});
