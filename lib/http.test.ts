import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "./http";

const res = (status: number, body: string, type = "application/json") =>
  new Response(body, { status, headers: { "content-type": type } });

afterEach(() => vi.unstubAllGlobals());

describe("apiFetch", () => {
  it("정상 JSON", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => res(200, '{"hits":[1]}')));
    await expect(apiFetch<{ hits: number[] }>("/api/x")).resolves.toEqual({ hits: [1] });
  });
  it("502 HTML이면 JSON 파싱 오류 대신 상태 문구", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => res(502, "<html>Bad Gateway</html>", "text/html")));
    const e = (await apiFetch("/api/x").catch((x) => x)) as ApiError;
    expect(e).toBeInstanceOf(ApiError);
    expect(e.status).toBe(502);
    expect(e.message).not.toMatch(/Unexpected token/);
    expect(e.message).toMatch(/서버 응답/);
  });
  it("429 JSON error 필드를 그대로", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => res(429, '{"error":"오늘 한도 끝"}')));
    await expect(apiFetch("/api/x")).rejects.toMatchObject({ status: 429, message: "오늘 한도 끝" });
  });
  it("타임아웃이면 AbortError → 안내 문구", async () => {
    vi.stubGlobal("navigator", { onLine: true });
    vi.stubGlobal(
      "fetch",
      vi.fn((_u: string, init: RequestInit) => new Promise((_, rej) => init.signal?.addEventListener("abort", () => rej(Object.assign(new Error("aborted"), { name: "AbortError" }))))),
    );
    await expect(apiFetch("/api/x", {}, 20)).rejects.toMatchObject({ status: 0, message: expect.stringContaining("늦어") });
  });
});
