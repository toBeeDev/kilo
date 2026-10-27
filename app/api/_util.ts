import { NextResponse } from "next/server";
import { isAiConfigured } from "@/lib/config";

export { guard, errorResponse } from "@/lib/api-guard";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
/** 총평 입력 JSON 상한. 정상 입력은 2~3KB. */
export const MAX_JSON_BYTES = 64 * 1024;

export function requireAi() {
  if (!isAiConfigured()) {
    return NextResponse.json(
      { error: "AI 키가 없어. .env.local에 GOOGLE_API_KEY(또는 ANTHROPIC_API_KEY) 넣고 서버 재시작." },
      { status: 503 },
    );
  }
  return null;
}

/** Content-Length가 있으면 먼저 자른다. 없으면 본문을 읽고 나서 잰다. */
export function tooLarge(req: Request, max: number) {
  const n = Number(req.headers.get("content-length") ?? 0);
  return Number.isFinite(n) && n > max;
}

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function readImage(form: FormData) {
  const file = form.get("image");
  if (!(file instanceof Blob)) return null;
  if (file.size > MAX_IMAGE_BYTES) throw new Error("이미지가 5MB를 넘어. 클라이언트에서 줄여서 보내.");
  const type = file.type || "image/jpeg";
  if (!IMAGE_TYPES.has(type)) throw new Error("jpeg/png/webp/gif 이미지만 받아.");
  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  return { base64, mediaType: type as "image/jpeg" | "image/png" | "image/webp" | "image/gif" };
}
