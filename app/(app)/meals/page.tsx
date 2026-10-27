import type { Metadata } from "next";
import MealsView from "@/components/views/MealsView";
import { JsonLd } from "@/components/JsonLd";
import { buildMetadata, pageJsonLd, type PageSeo } from "@/lib/seo";

const seo: PageSeo = {
  title: "식단",
  description: "사진 한 장으로 음식별 칼로리와 탄단지를 추정하고, 자주 먹는 식단은 탭 한 번에 기록.",
  path: "/meals",
  absoluteTitle: false,
};

export const metadata: Metadata = buildMetadata(seo);

export default function Page() {
  return (
    <>
      <JsonLd data={pageJsonLd(seo)} />
      <MealsView />
    </>
  );
}
