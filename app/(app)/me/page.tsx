import type { Metadata } from "next";
import MeView from "@/components/views/MeView";
import { JsonLd } from "@/components/JsonLd";
import { buildMetadata, pageJsonLd, type PageSeo } from "@/lib/seo";

const seo: PageSeo = {
  title: "마이",
  description: "인바디 결과지로 목표 칼로리와 매크로를 계산하고 체중·체지방률·골격근량 추세를 본다.",
  path: "/me",
  absoluteTitle: false,
};

export const metadata: Metadata = buildMetadata(seo);

export default function Page() {
  return (
    <>
      <JsonLd data={pageJsonLd(seo)} />
      <MeView />
    </>
  );
}
