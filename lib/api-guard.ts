import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { GUEST_COOKIE, isSupabaseConfigured } from "./config";
import { supabaseServer } from "./supabase/server";

/**
 * 서버 전용. /api/* 보호 계층.
 *
 * 1. 신원: 로그인 사용자(Supabase 세션) 또는 게스트 쿠키. 둘 다 없으면 401.
 *    Supabase가 켜져 있으면 비용 드는 AI 호출은 로그인 사용자만 (AI_ALLOW_GUEST=1 로 풀 수 있음).
 * 2. 버스트: IP당 분당 호출 수 (인스턴스 메모리. 서버리스라 완벽하진 않지만 스크립트 난사는 막는다).
 * 3. 일일 상한: 브라우저별 서명 쿠키에 오늘 사용량을 적어 둔다. 서버 저장소 없이 동작.
 *    쿠키를 지우면 초기화되지만, 1번 로그인 조건과 2번 버스트 제한이 뒤를 받친다.
 */

export type Bucket = "photo" | "summary" | "food";

const QUOTA_COOKIE = "kilo-ai-quota";
const MAX_AGE = 60 * 60 * 36; // 36h — 자정 넘기면 날짜 키가 바뀌어 자연 초기화

const LIMITS: Record<Bucket, number> = {
  photo: int(process.env.AI_DAILY_PHOTO_LIMIT, 20), // 식단 사진 + 인바디 결과지
  summary: int(process.env.AI_DAILY_SUMMARY_LIMIT, 3),
  food: int(process.env.FOOD_DAILY_LIMIT, 100),
};
const BURST_PER_MIN: Record<Bucket, number> = { photo: 10, summary: 5, food: 30 };

function int(v: string | undefined, d: number) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : d;
}

/** 서명 키. 따로 안 주면 AI 키에서 파생 — 클라이언트는 모르는 값이면 충분하다. */
function secret() {
  const s = process.env.AI_LIMIT_SECRET || process.env.GOOGLE_API_KEY || process.env.ANTHROPIC_API_KEY || "";
  return "kilo-quota:" + s;
}

const todayKey = () => {
  // 한국 기준 날짜로 리셋 (서버는 UTC일 수 있음)
  const d = new Date(Date.now() + 9 * 3600_000);
  return d.toISOString().slice(0, 10);
};

type Usage = { day: string; photo: number; summary: number; food: number };

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function parseQuota(raw: string | undefined): Usage {
  const empty: Usage = { day: todayKey(), photo: 0, summary: 0, food: 0 };
  if (!raw) return empty;
  const i = raw.lastIndexOf(".");
  if (i < 0) return empty;
  const payload = raw.slice(0, i);
  const sig = raw.slice(i + 1);
  const expect = sign(payload);
  if (sig.length !== expect.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return empty;
  const [day, photo, summary, food] = payload.split(":");
  if (day !== todayKey()) return empty;
  return { day, photo: int(photo, 0), summary: int(summary, 0), food: int(food, 0) };
}

function serializeQuota(u: Usage) {
  const payload = `${u.day}:${u.photo}:${u.summary}:${u.food}`;
  return `${payload}.${sign(payload)}`;
}

/* ---------- IP 버스트 ---------- */

const burst = new Map<string, { n: number; resetAt: number }>();
function hitBurst(key: string, limit: number) {
  const now = Date.now();
  const cur = burst.get(key);
  if (!cur || cur.resetAt < now) {
    burst.set(key, { n: 1, resetAt: now + 60_000 });
    if (burst.size > 5000) for (const [k, v] of burst) if (v.resetAt < now) burst.delete(k);
    return true;
  }
  cur.n += 1;
  return cur.n <= limit;
}

function clientIp(req: Request) {
  const h = req.headers;
  return (h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0] || "local").trim();
}

/* ---------- 신원 ---------- */

export type Identity = { kind: "user"; id: string } | { kind: "guest"; id: string };

async function identify(req: Request): Promise<Identity | null> {
  if (isSupabaseConfigured()) {
    try {
      const sb = await supabaseServer();
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (user) return { kind: "user", id: user.id };
    } catch {
      /* 세션 없음 → 게스트 판정으로 */
    }
  }
  const jar = await cookies();
  if (jar.get(GUEST_COOKIE)?.value === "1") return { kind: "guest", id: "guest@" + clientIp(req) };
  return null;
}

const guestAllowed = () => !isSupabaseConfigured() || process.env.AI_ALLOW_GUEST === "1";

/* ---------- 공개 API ---------- */

export interface Guard {
  ok: true;
  who: string; // 로그용 (user:abcd1234 / guest)
  identity: Identity;
  /** 모델을 실제로 호출한 뒤(성공/실패 무관) 응답에 사용량 쿠키를 얹는다. */
  commit: <R extends NextResponse>(res: R) => R;
  remaining: number;
}
export type GuardResult = Guard | { ok: false; res: NextResponse };

const fail = (status: number, error: string) => ({ ok: false as const, res: NextResponse.json({ error }, { status }) });

export async function guard(req: Request, bucket: Bucket): Promise<GuardResult> {
  const identity = await identify(req);
  if (!identity) return fail(401, "로그인하거나 '로그인 없이 쓰기'로 들어온 뒤에 써.");
  if (identity.kind === "guest" && bucket !== "food" && !guestAllowed()) {
    return fail(403, "AI 분석은 로그인한 계정에서만 쓸 수 있어. 마이 탭에서 로그인해.");
  }

  const ip = clientIp(req);
  if (!hitBurst(`${bucket}:${ip}`, BURST_PER_MIN[bucket])) {
    return fail(429, "너무 빠르게 요청하고 있어. 1분 뒤에 다시.");
  }

  const jar = await cookies();
  const usage = parseQuota(jar.get(QUOTA_COOKIE)?.value);
  const limit = LIMITS[bucket];
  if (usage[bucket] >= limit) {
    const what = bucket === "summary" ? "총평" : bucket === "photo" ? "사진 분석" : "음식 검색";
    return fail(429, `오늘 ${what} 한도(${limit}회)를 다 썼어. 내일 다시.`);
  }

  const who = identity.kind === "user" ? `user:${identity.id.slice(0, 8)}` : "guest";
  const next: Usage = { ...usage, [bucket]: usage[bucket] + 1 };
  return {
    ok: true,
    who,
    identity,
    remaining: limit - next[bucket],
    commit: (res) => {
      res.cookies.set(QUOTA_COOKIE, serializeQuota(next), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/api",
        maxAge: MAX_AGE,
      });
      res.headers.set("x-kilo-remaining", String(limit - next[bucket]));
      return res;
    },
  };
}

/** 모델/외부 API 오류를 사용자 메시지로. 상태 코드는 원인에 맞게. */
export function errorResponse(e: unknown): NextResponse {
  const msg = e instanceof Error ? e.message : String(e);
  const low = msg.toLowerCase();
  if (low.includes("timeout") || low.includes("timed out") || low.includes("abort")) {
    return NextResponse.json({ error: "모델 응답이 너무 늦어. 잠시 후 다시." }, { status: 504 });
  }
  if (low.includes("429") || low.includes("quota") || low.includes("resource_exhausted") || low.includes("rate limit")) {
    return NextResponse.json({ error: "AI 쪽 할당량이 막혔어. 결제 설정이나 한도를 확인해." }, { status: 503 });
  }
  if (low.includes("403") || low.includes("permission") || low.includes("api key") || low.includes("401")) {
    return NextResponse.json({ error: "AI 키가 거부됐어. 키/결제 상태를 확인해." }, { status: 503 });
  }
  return NextResponse.json({ error: msg.slice(0, 300) }, { status: 500 });
}
