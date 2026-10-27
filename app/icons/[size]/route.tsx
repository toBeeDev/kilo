import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import { AppIcon } from "@/components/AppIcon";

/** 매니페스트용 PNG 아이콘. /icons/192, /icons/512. iOS는 SVG 매니페스트 아이콘을 무시해서 PNG가 필요하다. */
const SIZES = new Set([180, 192, 512]);

export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const n = Number((await params).size);
  if (!SIZES.has(n)) return NextResponse.json({ error: "180, 192, 512 중 하나" }, { status: 404 });
  return new ImageResponse(<AppIcon size={n} />, {
    width: n,
    height: n,
    headers: { "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
