import type { Metadata } from "next";
import HomeView from "@/components/views/HomeView";
import { JsonLd } from "@/components/JsonLd";
import { buildMetadata, pageJsonLd, type PageSeo } from "@/lib/seo";

const seo: PageSeo = {
  title: "kilo — 인바디 기반 식단·운동 기록",
  description: "오늘 먹은 칼로리·단백질·물과 운동 볼륨을 한 화면에서. 달력으로 지난 날짜도 바로 본다.",
  path: "/",
  absoluteTitle: true,
};

export const metadata: Metadata = buildMetadata(seo);

export default function Page() {
  return (
    <>
      <JsonLd data={pageJsonLd(seo)} />
      <HomeView />
    </>
  );
}
