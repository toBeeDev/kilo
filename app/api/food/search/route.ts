import { NextResponse } from "next/server";
import { isMfdsConfigured } from "@/lib/config";
import { searchFood } from "@/lib/mfds";
import { errorResponse, guard } from "../../_util";

export const runtime = "nodejs";
export const maxDuration = 15;

export async function GET(req: Request) {
  const g = await guard(req, "food");
  if (!g.ok) return g.res;
  if (!isMfdsConfigured()) {
    return NextResponse.json(
      { error: "식약처 API 키가 없어. 공공데이터포털에서 '식품의약품안전처_식품영양성분DB정보' 신청하고 .env.local에 MFDS_API_KEY." },
      { status: 503 },
    );
  }
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 60);
  if (q.length < 1) return NextResponse.json({ hits: [] });
  try {
    const hits = await searchFood(q);
    return g.commit(NextResponse.json({ hits }));
  } catch (e) {
    return g.commit(errorResponse(e));
  }
}
