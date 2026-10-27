import type { Metadata } from "next";

/**
 * 페이지별 SEO 한 곳에서.
 * - buildMetadata(): title/description/canonical/OG/Twitter/robots 를 규칙대로 채운다.
 * - webAppJsonLd(): 사이트 전체 (루트 레이아웃에 한 번)
 * - pageJsonLd(): 페이지 단위 WebPage (각 page.tsx 에서)
 * 각 page.tsx 는 서버 컴포넌트로 두고, 화면 본체는 components/views/* (client) 가 맡는다.
 */

export const SITE = {
  name: "kilo",
  tagline: "인바디 기반 식단·운동 기록",
  description: "인바디 사진으로 목표 칼로리를 잡고, 식단은 사진 한 장, 운동은 세트 단위로 기록하는 개인용 PWA.",
  locale: "ko_KR",
  lang: "ko",
} as const;

/** 배포 주소. NEXT_PUBLIC_SITE_URL > Vercel 프로덕션 도메인 > Vercel 프리뷰 > 로컬 */
export function siteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

export interface PageSeo {
  /** 탭 이름. 템플릿에 따라 "식단 · kilo" 로 붙는다. */
  title: string;
  description: string;
  /** "/" , "/meals" 처럼 슬래시로 시작 */
  path: string;
  /** 사이트명 템플릿 없이 그대로 쓰기 (홈) */
  absoluteTitle?: boolean;
  /** 검색 노출 제외 (로그인 등) */
  noIndex?: boolean;
}

export function buildMetadata(p: PageSeo): Metadata {
  const url = `${siteUrl()}${p.path}`;
  const title = p.absoluteTitle ? { absolute: p.title } : p.title;
  const ogTitle = p.absoluteTitle ? p.title : `${p.title} · ${SITE.name}`;
  return {
    title,
    description: p.description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: SITE.name,
      locale: SITE.locale,
      url,
      title: ogTitle,
      description: p.description,
      images: [{ url: "/icons/512", width: 512, height: 512, alt: SITE.name }],
    },
    twitter: { card: "summary", title: ogTitle, description: p.description },
    robots: p.noIndex ? { index: false, follow: false } : { index: true, follow: true },
  };
}

/** 루트 레이아웃 기본값. 페이지가 덮어쓰지 않은 필드만 남는다. */
export function rootMetadata(): Metadata {
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: SITE.name, template: `%s · ${SITE.name}` },
    description: SITE.description,
    applicationName: SITE.name,
    manifest: "/manifest.webmanifest",
    appleWebApp: { capable: true, statusBarStyle: "default", title: SITE.name },
    formatDetection: { telephone: false },
    openGraph: { type: "website", siteName: SITE.name, locale: SITE.locale },
  };
}

/* ---------------- JSON-LD ---------------- */

export function webAppJsonLd() {
  const url = siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: SITE.name,
    url,
    description: SITE.description,
    applicationCategory: "HealthApplication",
    operatingSystem: "iOS, Android, Web",
    inLanguage: SITE.lang,
    offers: { "@type": "Offer", price: "0", priceCurrency: "KRW" },
    featureList: ["인바디 사진 → 목표 칼로리·매크로", "식단 사진 AI 분석", "운동 세트 기록·루틴", "주간 분석·인바디 추세"],
  };
}

export function pageJsonLd(p: PageSeo) {
  const base = siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: p.absoluteTitle ? p.title : `${p.title} · ${SITE.name}`,
    description: p.description,
    url: `${base}${p.path}`,
    inLanguage: SITE.lang,
    isPartOf: { "@type": "WebSite", name: SITE.name, url: base },
  };
}
