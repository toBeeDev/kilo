import { NextResponse } from "next/server";
import { parseInbodyImage } from "@/lib/ai";
import { readImage, requireAi } from "../../_util";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const blocked = requireAi();
  if (blocked) return blocked;
  try {
    const img = await readImage(await req.formData());
    if (!img) return NextResponse.json({ error: "image 필드가 없어." }, { status: 400 });
    const parsed = await parseInbodyImage(img.base64, img.mediaType);
    return NextResponse.json(parsed);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
