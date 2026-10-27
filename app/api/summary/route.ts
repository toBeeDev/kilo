import { NextResponse } from "next/server";
import { dailySummary, sanitizeSummaryInput } from "@/lib/ai";
import { aiModel } from "@/lib/config";
import { MAX_JSON_BYTES, errorResponse, guard, requireAi, tooLarge } from "../_util";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const g = await guard(req, "summary");
  if (!g.ok) return g.res;
  const blocked = requireAi();
  if (blocked) return blocked;
  if (tooLarge(req, MAX_JSON_BYTES)) return NextResponse.json({ error: "입력이 너무 커." }, { status: 413 });

  let input: ReturnType<typeof sanitizeSummaryInput>;
  try {
    const raw = await req.text();
    if (raw.length > MAX_JSON_BYTES) return NextResponse.json({ error: "입력이 너무 커." }, { status: 413 });
    input = sanitizeSummaryInput(JSON.parse(raw));
  } catch {
    return NextResponse.json({ error: "입력 형식이 잘못됐어." }, { status: 400 });
  }
  if (!input) return NextResponse.json({ error: "입력이 비었어." }, { status: 400 });

  try {
    const out = await dailySummary(input, { route: "summary", who: g.who });
    if (!out.summary) throw new Error("총평이 비어서 왔어. 다시 시도.");
    return g.commit(NextResponse.json({ ...out, model: aiModel() }));
  } catch (e) {
    return g.commit(errorResponse(e));
  }
}
