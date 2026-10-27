import { NextResponse } from "next/server";
import { parseInbodyImage } from "@/lib/ai";
import { MAX_IMAGE_BYTES, errorResponse, guard, readImage, requireAi, tooLarge } from "../../_util";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const g = await guard(req, "photo");
  if (!g.ok) return g.res;
  const blocked = requireAi();
  if (blocked) return blocked;
  if (tooLarge(req, MAX_IMAGE_BYTES + 64 * 1024)) return NextResponse.json({ error: "이미지가 5MB를 넘어." }, { status: 413 });

  let img: Awaited<ReturnType<typeof readImage>>;
  try {
    img = await readImage(await req.formData());
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  if (!img) return NextResponse.json({ error: "image 필드가 없어." }, { status: 400 });

  try {
    const parsed = await parseInbodyImage(img.base64, img.mediaType, { route: "inbody/parse", who: g.who });
    return g.commit(NextResponse.json(parsed));
  } catch (e) {
    return g.commit(errorResponse(e));
  }
}
