"use client";

/**
 * /api/* 호출 공통. 상태 코드부터 보고 JSON은 그 다음에 읽는다.
 * 502/504 HTML 응답을 JSON.parse 하다 "Unexpected token <" 가 사용자에게 보이는 일을 막는다.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

const DEFAULT_TIMEOUT = 35_000; // 서버 maxDuration(30s)보다 약간 길게

export async function apiFetch<T>(url: string, init: RequestInit = {}, timeoutMs = DEFAULT_TIMEOUT): Promise<T> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: ctl.signal });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw new ApiError("응답이 너무 늦어. 잠시 후 다시.", 0);
    throw new ApiError(navigator.onLine === false ? "오프라인이야. 연결되면 다시." : "서버에 연결 못 했어.", 0);
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const fromBody = json && typeof json === "object" && typeof (json as { error?: unknown }).error === "string" ? (json as { error: string }).error : null;
    throw new ApiError(fromBody ?? statusMessage(res.status), res.status);
  }
  if (json === null) throw new ApiError("서버 응답을 읽을 수 없어.", res.status);
  return json as T;
}

function statusMessage(status: number) {
  if (status === 401) return "로그인이 필요해.";
  if (status === 413) return "보낸 데이터가 너무 커.";
  if (status === 429) return "요청이 너무 많아. 잠시 후 다시.";
  if (status === 503) return "서버가 지금 바빠. 잠시 후 다시.";
  if (status === 502 || status === 504) return "서버 응답이 없어. 잠시 후 다시.";
  return `요청 실패 (${status})`;
}
