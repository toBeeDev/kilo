import { NextResponse } from "next/server";
import { dailySummary, type SummaryInput } from "@/lib/ai";
import { aiModel } from "@/lib/config";
import { requireAi } from "../_util";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const blocked = requireAi();
  if (blocked) return blocked;
  try {
    const input = (await req.json()) as SummaryInput;
    if (!input?.day || !input.actual) return NextResponse.json({ error: "입력이 비었어." }, { status: 400 });
    const out = await dailySummary(input);
    if (!out.summary) throw new Error("총평이 비어서 왔어. 다시 시도.");
    return NextResponse.json({ ...out, model: aiModel() });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
