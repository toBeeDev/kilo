import Anthropic from "@anthropic-ai/sdk";
import { AI_MODEL, isAiConfigured } from "./config";
import type { MealItem } from "./types";

/**
 * 서버 전용. 클라이언트에서 import 금지.
 * 모델은 "읽기/파싱"만 한다. 숫자 계산은 lib/macros.ts.
 */

type ImageMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

function client() {
  if (!isAiConfigured()) throw new Error("ANTHROPIC_API_KEY 없음");
  return new Anthropic();
}

function extractJson<T>(text: string): T {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("JSON 없음: " + text.slice(0, 200));
  return JSON.parse(m[0]) as T;
}

function textOf(res: Anthropic.Message): string {
  return res.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();
}

/* ---------------- 인바디 결과지 ---------------- */

export interface InbodyParsed {
  measuredOn?: string; // YYYY-MM-DD
  weight?: number;
  bodyFatPct?: number;
  skeletalMuscle?: number;
  bodyFatMass?: number;
  confidence: "high" | "medium" | "low";
  notes?: string;
}

const INBODY_PROMPT = `인바디(InBody) 결과지 사진이다. 아래 값을 찾아 JSON으로만 답해라. 설명 금지.
찾을 값:
- measuredOn: 검사일시 → "YYYY-MM-DD". 못 찾으면 생략.
- weight: 체중 kg (숫자)
- bodyFatPct: 체지방률 % (숫자). "체지방률" 또는 "PBF".
- skeletalMuscle: 골격근량 kg (숫자). "골격근량" 또는 "SMM". 제지방량/근육량과 혼동하지 말 것.
- bodyFatMass: 체지방량 kg (숫자, 있으면)
- confidence: "high" | "medium" | "low" — 글자가 흐리거나 값이 애매하면 낮춰라.
- notes: 못 읽은 항목이나 주의점 한 줄 (선택)

형식: {"measuredOn":"2026-10-26","weight":75.2,"bodyFatPct":15.3,"skeletalMuscle":36.1,"bodyFatMass":11.5,"confidence":"high"}`;

export async function parseInbodyImage(
  base64: string,
  mediaType: ImageMediaType,
): Promise<InbodyParsed> {
  const res = await client().messages.create({
    model: AI_MODEL,
    max_tokens: 400,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: INBODY_PROMPT },
        ],
      },
    ],
  });
  const parsed = extractJson<Partial<InbodyParsed>>(textOf(res));
  return { ...parsed, confidence: parsed.confidence ?? "medium" };
}

/* ---------------- 식단 ---------------- */

export interface MealParsed {
  items: MealItem[];
  note?: string;
}

const MEAL_PROMPT = `한국인의 한 끼 식사다. 사진(있으면)과 설명(있으면)을 보고 음식별로 추정해서 JSON으로만 답해라. 설명 금지.

규칙:
- items 배열. 각 항목: name(한국어 음식명, 브랜드 있으면 포함), grams(추정 중량 g), kcal, protein(g), fat(g), carbs(g), sodium(mg).
- 양은 보수적으로. 밥 1공기 = 210g 310kcal, 닭가슴살 1팩 = 100g 110kcal 기준.
- 사진에서 양을 가늠하기 어려우면 일반적인 1인분으로 잡고 note에 "양 확인 필요"라고 써라.
- 설명이 사진과 다르면 설명을 우선.
- 숫자는 정수.

형식: {"items":[{"name":"햇반","grams":210,"kcal":310,"protein":6,"fat":1,"carbs":69,"sodium":5}],"note":"..."}`;

export async function parseMeal(input: {
  base64?: string;
  mediaType?: ImageMediaType;
  text?: string;
}): Promise<MealParsed> {
  const content: Anthropic.ContentBlockParam[] = [];
  if (input.base64 && input.mediaType) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: input.mediaType, data: input.base64 },
    });
  }
  content.push({
    type: "text",
    text: MEAL_PROMPT + (input.text ? `\n\n설명: ${input.text}` : ""),
  });

  const res = await client().messages.create({
    model: AI_MODEL,
    max_tokens: 800,
    messages: [{ role: "user", content }],
  });
  const parsed = extractJson<MealParsed>(textOf(res));
  const items = (parsed.items ?? []).map((i) => ({
    name: String(i.name ?? "").trim(),
    grams: Math.round(Number(i.grams) || 0),
    kcal: Math.round(Number(i.kcal) || 0),
    protein: Math.round(Number(i.protein) || 0),
    fat: Math.round(Number(i.fat) || 0),
    carbs: Math.round(Number(i.carbs) || 0),
    sodium: Math.round(Number(i.sodium) || 0),
  }));
  return { items, note: parsed.note };
}

/* ---------------- 하루 총평 ---------------- */

export interface SummaryInput {
  day: string;
  goalLabel: string; // 린매스업 등
  target: { kcal: number; protein: number; fat: number; carbs: number } | null;
  actual: { kcal: number; protein: number; fat: number; carbs: number; sodium: number; waterMl: number; waterTarget: number };
  meals: string[]; // "점심: 햇반, 훈제 닭가슴살 2팩 (700kcal)"
  workout: { volume: number; sets: number; lines: string[]; muscles: string[] } | null;
  body?: { weight: number; bodyFatPct: number; skeletalMuscle?: number } | null;
}

export interface SummaryOutput {
  summary: string;
  nextStep: string;
}

const SUMMARY_PROMPT = `너는 린매스업/벌크업/다이어트를 코칭하는 트레이너다. 아래 하루 기록을 보고 반말로 짧게 총평해라. JSON으로만 답해라.

규칙:
- summary: 최대 3문장. 숫자는 구체적으로(단백질 -28g 같은 식). 잘한 것 하나, 아쉬운 것 하나, 나머지는 생략.
- nextStep: 내일 할 것 딱 하나. 음식이면 구체적 메뉴와 양(닭가슴살 1팩, 삶은계란 2개). 운동이면 종목/세트.
- 단백질이 목표보다 20g 이상 모자라면 반드시 언급하고 채울 음식 제안.
- 나트륨 3,500mg 넘으면 물 500mL 더 + 양념육→구이 같은 교체 제안.
- 지방이 목표의 130% 넘으면 어디서 왔는지 짚어라.
- 물이 목표의 70% 미만이면 한 줄.
- 운동했으면 자극 부위와 볼륨 한마디. 안 했으면 언급하지 마라.
- 칭찬 남발 금지. 이모지 금지. "~해보세요" 같은 존댓말 금지.

형식: {"summary":"...","nextStep":"..."}`;

export async function dailySummary(input: SummaryInput): Promise<SummaryOutput> {
  const res = await client().messages.create({
    model: AI_MODEL,
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: SUMMARY_PROMPT + "\n\n기록:\n" + JSON.stringify(input, null, 1),
      },
    ],
  });
  const parsed = extractJson<Partial<SummaryOutput>>(textOf(res));
  return {
    summary: String(parsed.summary ?? "").trim(),
    nextStep: String(parsed.nextStep ?? "").trim(),
  };
}
