import { NextResponse } from "next/server";
import { isAiConfigured } from "@/lib/config";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function requireAi() {
  if (!isAiConfigured()) {
    return NextResponse.json(
      { error: "AI 키가 없어. .env.local에 ANTHROPIC_API_KEY 넣고 서버 재시작." },
      { status: 503 },
    );
  }
  return null;
}

export async function readImage(form: FormData) {
  const file = form.get("image");
  if (!(file instanceof Blob)) return null;
  if (file.size > MAX_IMAGE_BYTES) throw new Error("이미지가 5MB를 넘어. 클라이언트에서 줄여서 보내.");
  const type = (file.type || "image/jpeg") as "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  return { base64, mediaType: type };
}
