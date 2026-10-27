import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeLocalIds, localCounts } from "./migrate";
import { LOCAL_KEYS } from "./repo";
import { isUuid } from "./types";

function fakeStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    key: (i: number) => [...m.keys()][i] ?? null,
    get length() {
      return m.size;
    },
    clear: () => m.clear(),
  };
}

beforeEach(() => vi.stubGlobal("localStorage", fakeStorage()));
afterEach(() => vi.unstubAllGlobals());

describe("normalizeLocalIds", () => {
  it("non-UUID id를 UUID로 바꾸고 다시 저장, UUID는 그대로", () => {
    const keep = "11111111-1111-4111-8111-111111111111";
    localStorage.setItem(LOCAL_KEYS.sets, JSON.stringify([{ id: "k3j4oldfallback", doneOn: "2026-10-01" }, { id: keep }]));
    localStorage.setItem(LOCAL_KEYS.meals, "not json");
    normalizeLocalIds();
    const rows = JSON.parse(localStorage.getItem(LOCAL_KEYS.sets)!) as { id: string }[];
    expect(isUuid(rows[0].id)).toBe(true);
    expect(rows[1].id).toBe(keep);
    expect(localStorage.getItem(LOCAL_KEYS.meals)).toBe("not json"); // 깨진 키는 건드리지 않음
  });
  it("두 번 돌려도 id가 또 바뀌지 않는다 (재시도 안전)", () => {
    localStorage.setItem(LOCAL_KEYS.favs, JSON.stringify([{ id: "old" }]));
    normalizeLocalIds();
    const first = (JSON.parse(localStorage.getItem(LOCAL_KEYS.favs)!) as { id: string }[])[0].id;
    normalizeLocalIds();
    expect((JSON.parse(localStorage.getItem(LOCAL_KEYS.favs)!) as { id: string }[])[0].id).toBe(first);
  });
});

describe("localCounts", () => {
  it("배열·맵 길이를 센다", () => {
    localStorage.setItem(LOCAL_KEYS.body, JSON.stringify([{}, {}]));
    localStorage.setItem(LOCAL_KEYS.sets, JSON.stringify([{}]));
    const c = localCounts();
    expect(c.body).toBe(2);
    expect(c.sets).toBe(1);
    expect(c.total).toBe(3);
  });
});
