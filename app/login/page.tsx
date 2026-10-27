import type { Metadata } from "next";
import LoginView from "@/components/views/LoginView";
import { JsonLd } from "@/components/JsonLd";
import { buildMetadata, pageJsonLd, type PageSeo } from "@/lib/seo";

const seo: PageSeo = {
  title: "로그인",
  description: "카카오·구글로 로그인하면 기록이 클라우드에 저장돼 어느 기기에서든 이어진다.",
  path: "/login",
  absoluteTitle: false, noIndex: true,
};

export const metadata: Metadata = buildMetadata(seo);

export default function Page() {
  return (
    <>
      <JsonLd data={pageJsonLd(seo)} />
      <LoginView />
    </>
  );
}
