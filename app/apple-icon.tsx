import { ImageResponse } from "next/og";
import { AppIcon } from "@/components/AppIcon";

/** iOS 홈 화면 아이콘. Next가 <link rel="apple-touch-icon"> 을 자동으로 넣는다. */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<AppIcon size={180} square />, size);
}
