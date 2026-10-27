import { describe, expect, it } from "vitest";
import { safeNext } from "./auth-redirect";

describe("safeNext", () => {
  it("같은 출처 경로만 통과", () => {
    expect(safeNext("/meals")).toBe("/meals");
    expect(safeNext("/workout?d=2026-10-27")).toBe("/workout?d=2026-10-27");
  });
  it("오픈 리다이렉트 시도는 /", () => {
    for (const bad of [null, "", "//evil.com", "/\\evil.com", "https://evil.com", "javascript:alert(1)", "/x\r\nSet-Cookie: a=b", "/auth/callback", "/api/summary", "meals"]) {
      expect(safeNext(bad)).toBe("/");
    }
  });
});
