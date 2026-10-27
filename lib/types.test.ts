import { describe, expect, it, vi } from "vitest";
import { isUuid, uid } from "./types";

describe("uid", () => {
  it("항상 v4 UUID 형식", () => {
    for (let i = 0; i < 50; i++) expect(isUuid(uid())).toBe(true);
  });
  it("randomUUID가 없는 환경(http)에서도 UUID", () => {
    const orig = globalThis.crypto;
    vi.stubGlobal("crypto", { getRandomValues: orig.getRandomValues.bind(orig) });
    try {
      const v = uid();
      expect(isUuid(v)).toBe(true);
      expect(v).not.toBe(uid());
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("crypto 자체가 없어도 UUID", () => {
    vi.stubGlobal("crypto", undefined);
    try {
      expect(isUuid(uid())).toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("isUuid", () => {
  it("예전 폴백 id는 거부", () => {
    expect(isUuid("k3j4h5g6lx1a2b3c")).toBe(false);
    expect(isUuid(undefined)).toBe(false);
  });
});
