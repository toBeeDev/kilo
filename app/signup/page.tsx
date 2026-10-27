import type { Metadata } from "next";
import LoginView from "@/components/views/LoginView";
import { JsonLd } from "@/components/JsonLd";
import { buildMetadata, pageJsonLd, type PageSeo } from "@/lib/seo";

const seo: PageSeo = {
  title: "회원가입",
  description: "이메일 하나로 가입하면 인바디·식단·운동 기록이 클라우드에 저장돼 어느 기기에서든 이어진다.",
  path: "/signup",
  absoluteTitle: false,
  noIndex: true,
};

export const metadata: Metadata = buildMetadata(seo);

export default function Page() {
  return (
    <>
      <JsonLd data={pageJsonLd(seo)} />
      <LoginView mode="signup" />
    </>
  );
}
