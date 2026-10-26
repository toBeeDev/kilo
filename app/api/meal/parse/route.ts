import { NextResponse } from "next/server";
import { parseMeal } from "@/lib/ai";
import { readImage, requireAi } from "../../_util";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const blocked = requireAi();
  if (blocked) return blocked;
  try {
    const form = await req.formData();
    const img = await readImage(form);
    const text = String(form.get("text") ?? "").trim() || undefined;
    if (!img && !text) {
      return NextResponse.json({ error: "사진이나 설명 중 하나는 있어야 해." }, { status: 400 });
    }
    const parsed = await parseMeal({ base64: img?.base64, mediaType: img?.mediaType, text });
    return NextResponse.json(parsed);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
