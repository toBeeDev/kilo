import type { Metadata } from "next";
import WorkoutView from "@/components/views/WorkoutView";
import { JsonLd } from "@/components/JsonLd";
import { buildMetadata, pageJsonLd, type PageSeo } from "@/lib/seo";

const seo: PageSeo = {
  title: "운동",
  description: "종목·세트·무게를 기록하면 바디맵에 자극 부위가 표시되고, 루틴으로 다음 운동을 한 번에 불러온다.",
  path: "/workout",
  absoluteTitle: false,
};

export const metadata: Metadata = buildMetadata(seo);

export default function Page() {
  return (
    <>
      <JsonLd data={pageJsonLd(seo)} />
      <WorkoutView />
    </>
  );
}
