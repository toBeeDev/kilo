/**
 * 서버 전용. 모델 호출 1건당 토큰·비용 로그.
 * stdout JSON 한 줄 → Vercel Logs / 로컬 터미널에서 `ai_usage` 로 검색.
 * 비용은 공개 단가(USD / 1M tokens) 기준 추정치. 단가가 바뀌면 PRICING만 고친다.
 */

export interface AiCallMeta {
  route: string; // "meal/parse" 등
  who: string; // user:abcd1234 / guest
}

export interface AiUsage {
  provider: "gemini" | "anthropic";
  model: string;
  inputTokens: number;
  outputTokens: number;
  ms: number;
  ok: boolean;
}

type Price = { input: number; output: number };
const PRICING: Record<string, Price> = {
  "gemini-2.5-flash": { input: 0.3, output: 2.5 },
  "gemini-2.5-flash-lite": { input: 0.1, output: 0.4 },
  "gemini-2.5-pro": { input: 1.25, output: 10 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
  "claude-sonnet-5-5": { input: 3, output: 15 },
};

export function estimateUsd(model: string, inputTokens: number, outputTokens: number): number | null {
  const key = Object.keys(PRICING).find((k) => model.startsWith(k));
  if (!key) return null;
  const p = PRICING[key];
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
}

export function logAiUsage(meta: AiCallMeta, u: AiUsage) {
  const usd = estimateUsd(u.model, u.inputTokens, u.outputTokens);
  const line = {
    t: "ai_usage",
    at: new Date().toISOString(),
    route: meta.route,
    who: meta.who,
    provider: u.provider,
    model: u.model,
    in: u.inputTokens,
    out: u.outputTokens,
    ms: u.ms,
    ok: u.ok,
    usd: usd == null ? undefined : Number(usd.toFixed(6)),
  };
  console.info(JSON.stringify(line));
}
