import "server-only";
/**
 * 식약처 식품영양성분DB (공공데이터포털 "식품의약품안전처_식품영양성분DB정보").
 * 서버 전용. 키는 MFDS_API_KEY (디코딩된 일반 인증키).
 *
 * 응답 필드 매핑은 공식 출력메세지 명세(xlsx) 기준으로 확인 필요. 흔히 쓰이는 매핑:
 *   AMT_NUM1 에너지(kcal) · AMT_NUM3 단백질 · AMT_NUM4 지방 · AMT_NUM6 탄수화물 · AMT_NUM13 나트륨(mg)
 * 틀리면 아래 FIELD 한 곳만 고치면 됨. (사과 단백질이 10g 넘게 나오면 매핑이 틀린 것.)
 */

const ENDPOINT = "https://apis.data.go.kr/1471000/FoodNtrCpntDbInfo02/getFoodNtrCpntDbInq02";

const FIELD = {
  name: "FOOD_NM_KR",
  maker: "MAKER_NM",
  category: "FOOD_CAT1_NM",
  servingSize: "SERVING_SIZE", // "100g", "1인분(250g)" 등 문자열
  basis: "NUTRI_AMOUNT_SERVING", // 영양성분 함량 기준량. "100g" / "100ml"
  kcal: "AMT_NUM1",
  protein: "AMT_NUM3",
  fat: "AMT_NUM4",
  carbs: "AMT_NUM6",
  sodium: "AMT_NUM13",
} as const;

export interface FoodHit {
  name: string;
  maker?: string;
  category?: string;
  /** 1회 제공량 g (파싱 가능할 때) */
  servingG?: number;
  /** 100g당 */
  per100: { kcal: number; protein: number; fat: number; carbs: number; sodium: number };
  source: "mfds";
}

const num = (v: unknown) => {
  const n = parseFloat(String(v ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

/** "1인분(250g)" / "100g" / "200ml" → 250 / 100 / 200 */
function gramsOf(v: unknown): number | undefined {
  const m = String(v ?? "").match(/(\d+(?:\.\d+)?)\s*(g|ml|mL|㎖)/);
  return m ? parseFloat(m[1]) : undefined;
}

type Raw = Record<string, unknown>;

function itemsOf(json: unknown): Raw[] {
  const j = json as { body?: { items?: unknown }; response?: { body?: { items?: unknown } } };
  const body = j.body ?? j.response?.body;
  const items = (body as { items?: unknown } | undefined)?.items;
  if (Array.isArray(items)) return items as Raw[];
  const inner = (items as { item?: unknown } | undefined)?.item;
  if (Array.isArray(inner)) return inner as Raw[];
  if (inner && typeof inner === "object") return [inner as Raw];
  return [];
}

export async function searchFood(q: string, rows = 20): Promise<FoodHit[]> {
  const key = process.env.MFDS_API_KEY ?? "";
  const url = new URL(ENDPOINT);
  url.searchParams.set("serviceKey", key);
  url.searchParams.set("FOOD_NM_KR", q);
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("numOfRows", String(rows));
  url.searchParams.set("type", "json");

  const res = await fetch(url, { next: { revalidate: 60 * 60 * 24 }, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`식약처 API ${res.status}`);
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    // 키 오류 등은 XML로 옴
    const m = text.match(/<returnAuthMsg>([^<]+)</) ?? text.match(/<errMsg>([^<]+)</);
    throw new Error(m ? `식약처 API: ${m[1]}` : "식약처 API 응답이 JSON이 아님");
  }

  return itemsOf(json).map((r) => {
    const basisG = gramsOf(r[FIELD.basis]) ?? 100;
    const f = 100 / basisG; // 기준량이 100g이 아니면 100g당으로 환산
    return {
      name: String(r[FIELD.name] ?? "").trim(),
      maker: String(r[FIELD.maker] ?? "").trim() || undefined,
      category: String(r[FIELD.category] ?? "").trim() || undefined,
      servingG: gramsOf(r[FIELD.servingSize]),
      per100: {
        kcal: Math.round(num(r[FIELD.kcal]) * f),
        protein: Math.round(num(r[FIELD.protein]) * f * 10) / 10,
        fat: Math.round(num(r[FIELD.fat]) * f * 10) / 10,
        carbs: Math.round(num(r[FIELD.carbs]) * f * 10) / 10,
        sodium: Math.round(num(r[FIELD.sodium]) * f),
      },
      source: "mfds" as const,
    };
  }).filter((h) => h.name);
}
