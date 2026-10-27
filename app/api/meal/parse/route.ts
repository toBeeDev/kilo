import { NextResponse } from "next/server";
import { parseMeal } from "@/lib/ai";
import { MAX_IMAGE_BYTES, errorResponse, guard, readImage, requireAi, tooLarge } from "../../_util";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_TEXT = 500;

export async function POST(req: Request) {
  const g = await guard(req, "photo");
  if (!g.ok) return g.res;
  const blocked = requireAi();
  if (blocked) return blocked;
  if (tooLarge(req, MAX_IMAGE_BYTES + 64 * 1024)) return NextResponse.json({ error: "이미지가 5MB를 넘어." }, { status: 413 });

  let img: Awaited<ReturnType<typeof readImage>>;
  let text: string | undefined;
  try {
    const form = await req.formData();
    img = await readImage(form);
    text = String(form.get("text") ?? "").trim().slice(0, MAX_TEXT) || undefined;
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  if (!img && !text) return NextResponse.json({ error: "사진이나 설명 중 하나는 있어야 해." }, { status: 400 });

  try {
    const parsed = await parseMeal({ base64: img?.base64, mediaType: img?.mediaType, text }, { route: "meal/parse", who: g.who });
    return g.commit(NextResponse.json(parsed));
  } catch (e) {
    return g.commit(errorResponse(e));
  }
}
